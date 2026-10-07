"""Testy STAG agenta (unittest, bez přístupu k síti — HTTP volání jsou mockovaná).

Spuštění:  cd stag_mock_import && python3 -m unittest test_stag_agent -v
"""

import base64
import io
import json
import os
import stat
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

import requests

import stag_agent
import test_import

TOKEN = "12|AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd"
TICKET = "ticket-secret-0123456789"


def encode_user_info(data) -> str:
    return base64.b64encode(json.dumps(data).encode("utf-8")).decode("ascii")


class FakeResponse:
    def __init__(self, status_code=200, data=None, text=""):
        self.status_code = status_code
        self._data = data if data is not None else {}
        self.text = text or json.dumps(self._data)

    def json(self):
        return self._data


class StagUserInfoTest(unittest.TestCase):
    STUDENT = {"role": "ST", "userName": "novakj", "osCislo": "R12345"}
    TEACHER = {"role": "VY", "userName": "novakj", "ucitIdno": 99}

    def test_wrapped_list_picks_student_role(self):
        raw = encode_user_info({"stagUserInfo": [self.TEACHER, self.STUDENT]})
        self.assertEqual(stag_agent.parse_stag_user_info(raw), ("novakj", "R12345"))

    def test_plain_list(self):
        raw = encode_user_info([self.TEACHER, self.STUDENT])
        self.assertEqual(stag_agent.parse_stag_user_info(raw), ("novakj", "R12345"))

    def test_single_object(self):
        raw = encode_user_info(self.STUDENT)
        self.assertEqual(stag_agent.parse_stag_user_info(raw), ("novakj", "R12345"))

    def test_plus_turned_into_space_is_repaired(self):
        # Hodnota, jejíž base64 obsahuje "+"
        data = {"stagUserInfo": [dict(self.STUDENT, userName="ž~>>?")]}
        raw = encode_user_info(data)
        self.assertIn("+", raw)
        self.assertEqual(stag_agent.parse_stag_user_info(raw.replace("+", " "))[1], "R12345")

    def test_missing_student_role(self):
        with self.assertRaisesRegex(ValueError, "roli studenta"):
            stag_agent.parse_stag_user_info(encode_user_info({"stagUserInfo": [self.TEACHER]}))

    def test_invalid_base64_or_json(self):
        with self.assertRaises(ValueError):
            stag_agent.parse_stag_user_info("not base64!!")
        with self.assertRaises(ValueError):
            stag_agent.parse_stag_user_info(base64.b64encode(b"{nope").decode())
        with self.assertRaises(ValueError):
            stag_agent.parse_stag_user_info("")


class ExtractTicketTest(unittest.TestCase):
    INFO = encode_user_info({"stagUserInfo": [{"role": "ST", "userName": "novakj", "osCislo": "R12345"}]})

    def test_full_callback_url(self):
        url = f"http://localhost:54321/callback?stagUserTicket={TICKET}&stagUserInfo={self.INFO}"
        self.assertEqual(stag_agent.extract_ticket_from_url(url), (TICKET, self.INFO.replace("+", " ")))

    def test_query_string_only(self):
        ticket, _ = stag_agent.extract_ticket_from_url(f"stagUserTicket={TICKET}&stagUserInfo=x")
        self.assertEqual(ticket, TICKET)

    def test_percent_encoded_info_survives(self):
        url = f"http://localhost:1/callback?stagUserTicket={TICKET}&stagUserInfo={self.INFO.replace('+', '%2B')}"
        _, info = stag_agent.extract_ticket_from_url(url)
        self.assertEqual(stag_agent.parse_stag_user_info(info), ("novakj", "R12345"))

    def test_cancelled_or_missing_ticket(self):
        for url in (
            "http://localhost:1/callback?stagUserTicket=anonymous",
            "http://localhost:1/callback?stagUserTicket=",
            "http://localhost:1/callback",
            "",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                stag_agent.extract_ticket_from_url(url)

    def test_store_login_result_saves_ticket(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "agent"
            url = f"http://localhost:1/callback?stagUserTicket={TICKET}&stagUserInfo={self.INFO}"
            stag_agent.store_login_result(url, home)
            saved = stag_agent.load_ticket(home)
            self.assertEqual(saved["ticket"], TICKET)
            self.assertEqual(saved["user_name"], "novakj")
            self.assertEqual(saved["student_id"], "R12345")
            self.assertIn("obtained_at", saved)


class MaskSecretsTest(unittest.TestCase):
    def test_known_secrets_are_masked(self):
        text = f"failed with ticket {TICKET} and token {TOKEN}"
        masked = stag_agent.mask_secrets(text, [TICKET, TOKEN])
        self.assertNotIn(TICKET, masked)
        self.assertNotIn(TOKEN, masked)

    def test_patterns_are_masked_without_knowing_the_value(self):
        masked = stag_agent.mask_secrets(
            f"Authorization: Bearer abc.def; token {TOKEN}; url ?stagUserTicket=xyz123&stagUserInfo=a"
        )
        self.assertNotIn("abc.def", masked)
        self.assertNotIn(TOKEN.split("|")[1], masked)
        self.assertNotIn("xyz123", masked)
        self.assertIn("stagUserInfo=a", masked)

    def test_empty_and_short_values_are_ignored(self):
        self.assertEqual(stag_agent.mask_secrets("a b c", [None, "", "b"]), "a b c")


@unittest.skipIf(os.name != "posix", "oprávnění souborů se testují jen na POSIX (WSL/Linux/macOS)")
class ConfigFilesTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name) / "agent"

    def tearDown(self):
        self._tmp.cleanup()

    def mode(self, path: Path) -> int:
        return stat.S_IMODE(path.stat().st_mode)

    def test_save_and_load_config_with_owner_only_permissions(self):
        stag_agent.save_config({"api_url": "https://eduvio.example/api", "agent_token": TOKEN}, self.home)

        self.assertEqual(self.mode(self.home), 0o700)
        self.assertEqual(self.mode(self.home / "config.json"), 0o600)

        config = stag_agent.load_config(self.home)
        self.assertEqual(config["api_url"], "https://eduvio.example/api")
        self.assertEqual(config["agent_token"], TOKEN)
        self.assertEqual(config["stag_ws_base_url"], stag_agent.DEFAULT_STAG_WS_BASE_URL)

    def test_existing_loose_permissions_are_tightened(self):
        self.home.mkdir(mode=0o755)
        os.chmod(self.home, 0o755)
        loose = self.home / "ticket.json"
        loose.write_text("{}")
        os.chmod(loose, 0o644)

        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)

        self.assertEqual(self.mode(self.home), 0o700)
        self.assertEqual(self.mode(loose), 0o600)

    def test_missing_files(self):
        self.assertEqual(stag_agent.load_config(self.home)["stag_ws_base_url"], stag_agent.DEFAULT_STAG_WS_BASE_URL)
        self.assertIsNone(stag_agent.load_ticket(self.home))


class ApiUrlTest(unittest.TestCase):
    def test_https_is_accepted_and_normalized(self):
        self.assertEqual(stag_agent.validate_api_url(" https://eduvio.example/api/ "), "https://eduvio.example/api")

    def test_http_on_localhost_is_accepted(self):
        for url in ("http://localhost/api", "http://127.0.0.1:8000/api", "http://[::1]/api"):
            with self.subTest(url=url):
                self.assertEqual(stag_agent.validate_api_url(url), url)

    def test_http_elsewhere_is_rejected(self):
        for url in ("http://eduvio.example/api", "http://192.168.1.5/api", "http://localhost.evil.com/api"):
            with self.subTest(url=url), self.assertRaises(stag_agent.AgentError) as ctx:
                stag_agent.validate_api_url(url)
            self.assertEqual(ctx.exception.exit_code, stag_agent.EXIT_CONFIG)

    def test_garbage_is_rejected(self):
        for url in ("", "eduvio.example/api", "ftp://eduvio.example"):
            with self.subTest(url=url), self.assertRaises(stag_agent.AgentError):
                stag_agent.validate_api_url(url)


class LoginUrlTest(unittest.TestCase):
    def test_matches_stag_auth_controller_format(self):
        url = stag_agent.build_login_url("https://stag-ws.upol.cz/ws/", "http://localhost:4321/callback")
        self.assertEqual(
            url,
            "https://stag-ws.upol.cz/ws/login?originalURL=http%3A%2F%2Flocalhost%3A4321%2Fcallback&longTicket=1",
        )


class RunSyncTest(unittest.TestCase):
    """Průchod run_sync s mockovanými HTTP voláními."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name) / "agent"
        self.config = {
            "api_url": "https://eduvio.example/api",
            "agent_token": TOKEN,
            "stag_ws_base_url": "https://stag.example/ws",
        }
        self.out, self.err = io.StringIO(), io.StringIO()

    def tearDown(self):
        self._tmp.cleanup()

    def run_agent(self, argv, get, post):
        args = stag_agent.parse_args(argv)
        with mock.patch("requests.get", side_effect=get), mock.patch("requests.post", side_effect=post), \
                redirect_stdout(self.out), redirect_stderr(self.err):
            return stag_agent.run_sync(args, self.config, self.home)

    @staticmethod
    def reports(post_mock):
        return [c.kwargs["json"] for c in post_mock.call_args_list if c.args[0].endswith("/stag/agent/report")]

    def assert_no_secret_leaked(self, post_mock):
        output = self.out.getvalue() + self.err.getvalue() + json.dumps(self.reports(post_mock))
        self.assertNotIn(TOKEN, output)
        self.assertNotIn(TICKET, output)

    def stag_get(self, subjects_status=200, info_status=200):
        def get(url, **kwargs):
            if url.endswith("/stag/agent/whoami"):
                return FakeResponse(200, {"name": "Jana", "email": "jana@example.com"})
            if url == "https://stag.example/ws/":
                return FakeResponse(404)
            if "getPredmetyByStudent" in url:
                if subjects_status != 200:
                    return FakeResponse(subjects_status, text=f"denied {TICKET}")
                return FakeResponse(200, {"predmetStudenta": [
                    {"zkratka": "AGT", "katedra": "KMI", "nazev": "Agent", "kredity": 5, "rok": "2026",
                     "statut": "A"},
                ]})
            if "getPredmetInfo" in url:
                if info_status != 200:
                    return FakeResponse(info_status, text=f"info denied {TICKET}")
                return FakeResponse(200, {"garanti": "'doc. Jan Garant, Ph.D.'", "prednasejici": "",
                                          "cvicici": "'Mgr. Eva Cvičící'", "typZkousky": "Zkouška",
                                          "maZapocetPredZk": "ANO", "anotace": "Anotace.\r\n\r\n"})
            if "getZnamkyByStudent" in url:
                return FakeResponse(200, {"student_na_predmetu": [
                    {"zkratka": "AGT", "katedra": "KMI", "rok": "2026", "semestr": "ZS",
                     "zppzk_hodnoceni": "S", "zppzk_datum": "18.12.2026", "zppzk_pokus": "1",
                     "zk_hodnoceni": "", "zk_pokus": "0", "zk_body": ""},
                ]})
            if "getRozvrhByStudent" in url:
                return FakeResponse(200, {"rozvrhovaAkce": []})
            raise AssertionError(f"unexpected GET {url}")
        return get

    def test_success_sends_data_and_success_report(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        post = mock.Mock(return_value=FakeResponse(200, {"message": "ok"}))

        code = self.run_agent([], self.stag_get(), post)

        self.assertEqual(code, stag_agent.EXIT_OK)
        urls = [c.args[0] for c in post.call_args_list]
        self.assertIn("https://eduvio.example/api/stag/sync-subjects", urls)
        self.assertEqual(self.reports(post), [{"status": "success"}])
        self.assertIn("jana@example.com", self.out.getvalue())
        self.assert_no_secret_leaked(post)

    def test_no_vpn_exits_2_without_report(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        base_get = self.stag_get()

        def get(url, **kwargs):
            if url.startswith("https://stag.example"):
                raise requests.ConnectionError("no route")
            return base_get(url, **kwargs)

        post = mock.Mock(return_value=FakeResponse(200))
        with self.assertRaises(stag_agent.AgentError) as ctx:
            self.run_agent([], get, post)

        self.assertEqual(ctx.exception.exit_code, stag_agent.EXIT_NO_VPN)
        self.assertIn("VPN", str(ctx.exception))
        post.assert_not_called()

    def test_invalid_agent_token_stops_before_stag(self):
        def get(url, **kwargs):
            if url.endswith("/stag/agent/whoami"):
                return FakeResponse(401)
            raise AssertionError("STAG must not be contacted")

        post = mock.Mock()
        with self.assertRaises(stag_agent.AgentError) as ctx:
            self.run_agent([], get, post)

        self.assertEqual(ctx.exception.exit_code, stag_agent.EXIT_CONFIG)
        self.assertIn("profilu", str(ctx.exception))
        post.assert_not_called()

    def test_non_interactive_without_ticket_reports_failed(self):
        post = mock.Mock(return_value=FakeResponse(200))
        with mock.patch.object(stag_agent, "login") as login, mock.patch("webbrowser.open") as browser:
            code = self.run_agent(["--non-interactive"], self.stag_get(), post)

        self.assertEqual(code, stag_agent.EXIT_LOGIN_REQUIRED)
        self.assertEqual(self.reports(post), [{"status": "failed", "error": stag_agent.TICKET_EXPIRED_MESSAGE}])
        login.assert_not_called()
        browser.assert_not_called()

    def test_non_interactive_with_rejected_ticket_reports_failed(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        post = mock.Mock(return_value=FakeResponse(200))

        code = self.run_agent(["--non-interactive"], self.stag_get(subjects_status=401), post)

        self.assertEqual(code, stag_agent.EXIT_LOGIN_REQUIRED)
        self.assertEqual(self.reports(post)[0]["error"], stag_agent.TICKET_EXPIRED_MESSAGE)
        self.assert_no_secret_leaked(post)

    def test_stag_error_reports_short_failure_without_response_body(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        post = mock.Mock(return_value=FakeResponse(200))

        code = self.run_agent([], self.stag_get(subjects_status=500), post)

        self.assertEqual(code, stag_agent.EXIT_SYNC_FAILED)
        report = self.reports(post)[0]
        self.assertEqual(report["status"], "failed")
        self.assertIn("500", report["error"])
        self.assertNotIn("denied", report["error"])
        self.assert_no_secret_leaked(post)

    def test_dry_run_sends_nothing(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        base_get = self.stag_get()

        def get(url, **kwargs):
            if "eduvio.example" in url:
                raise AssertionError("dry run must not contact the API")
            return base_get(url, **kwargs)

        post = mock.Mock()
        code = self.run_agent(["--dry-run"], get, post)

        self.assertEqual(code, stag_agent.EXIT_OK)
        post.assert_not_called()
        self.assertIn("1 předmětů (s info: 1, s výsledkem: 1)", self.out.getvalue())

    @staticmethod
    def sent_subjects(post_mock):
        return next(c.kwargs["json"] for c in post_mock.call_args_list if c.args[0].endswith("/stag/sync-subjects"))

    def test_sync_sends_subject_details_and_results(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        post = mock.Mock(return_value=FakeResponse(200, {"message": "ok"}))

        code = self.run_agent([], self.stag_get(), post)

        self.assertEqual(code, stag_agent.EXIT_OK)
        subject = self.sent_subjects(post)[0]
        self.assertEqual(subject["completionType"], "Credit + Exam")
        self.assertEqual(subject["guarantor"], "doc. Jan Garant, Ph.D.")
        self.assertEqual(subject["lecturer"], "doc. Jan Garant, Ph.D.")
        self.assertEqual(subject["tutors"], "Mgr. Eva Cvičící")
        self.assertEqual(subject["stagAnnotation"], "Anotace.")
        self.assertEqual(subject["creditResult"], "S")
        self.assertEqual(subject["creditDate"], "2026-12-18")
        self.assertIsNone(subject["examResult"])

    def test_subject_info_failure_does_not_stop_sync(self):
        stag_agent.save_ticket(TICKET, "novakj", "R12345", self.home)
        post = mock.Mock(return_value=FakeResponse(200, {"message": "ok"}))

        code = self.run_agent([], self.stag_get(info_status=500), post)

        self.assertEqual(code, stag_agent.EXIT_OK)
        self.assertEqual(self.reports(post), [{"status": "success"}])
        subject = self.sent_subjects(post)[0]
        # Bez info se klíče nepošlou, backend existující hodnoty nepřepíše
        for key in ("guarantor", "lecturers", "tutors", "stagAnnotation", "completionType"):
            self.assertNotIn(key, subject)
        self.assertNotIn("lecturer", subject)
        self.assertEqual(subject["creditResult"], "S")
        self.assertIn("Status: 500", self.err.getvalue())
        self.assertNotIn("info denied", self.err.getvalue())
        self.assert_no_secret_leaked(post)

    def test_api_url_override_must_be_https(self):
        with self.assertRaises(stag_agent.AgentError):
            self.run_agent(["--api-url", "http://eduvio.example/api"], self.stag_get(), mock.Mock())


class TestImportCompatibilityTest(unittest.TestCase):
    """test_import.py spouštěný ze StagSyncJob se chová stejně jako dřív."""

    def test_main_requires_bearer_token(self):
        err = io.StringIO()
        with mock.patch.object(test_import, "BEARER_TOKEN", ""), redirect_stderr(err), \
                self.assertRaises(SystemExit) as ctx:
            test_import.main()
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn("BEARER_TOKEN", err.getvalue())

    def test_subject_send_failure_still_exits_1(self):
        with mock.patch("requests.post", return_value=FakeResponse(422, text="invalid")), \
                redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()) as err, \
                self.assertRaises(SystemExit) as ctx:
            test_import.odesli_predmety_do_laravelu("http://laravel.test/api", "t", [{"code": "X"}])
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn("Chyba při synchronizaci předmětů (Status: 422): invalid", err.getvalue())

    def test_main_uses_env_api_url(self):
        posted = []

        def post(url, **kwargs):
            posted.append(url)
            return FakeResponse(200, {"message": "ok"})

        def get(url, **kwargs):
            if "getPredmetyByStudent" in url:
                return FakeResponse(200, {"predmetStudenta": [{"zkratka": "A", "nazev": "A", "kredity": 1}]})
            return FakeResponse(200, {"rozvrhovaAkce": []})

        with mock.patch.multiple(test_import, LARAVEL_API_URL="http://laravel.test/api", BEARER_TOKEN="t",
                                 STAG_TICKET="x", STAG_USER="u", STAG_STUDENT_ID="R1"), \
                mock.patch("requests.get", side_effect=get), mock.patch("requests.post", side_effect=post), \
                redirect_stdout(io.StringIO()), self.assertRaises(SystemExit) as ctx:
            test_import.main()

        self.assertEqual(ctx.exception.code, 0)
        self.assertEqual(posted, ["http://laravel.test/api/stag/sync-subjects"])


class HtmlToTextTest(unittest.TestCase):
    def test_tags_removed_and_paragraphs_kept_as_blank_lines(self):
        raw = "<p>První&nbsp;odstavec  s   <b>tučným</b> textem.</p><p>Druhý<br>řádek</p>"
        self.assertEqual(test_import.html_na_text(raw), "První odstavec s tučným textem.\n\nDruhý\nřádek")

    def test_list_items_and_entities(self):
        raw = "<ul><li>a &amp; b</li><li>c</li></ul>"
        self.assertEqual(test_import.html_na_text(raw), "- a & b\n- c")

    def test_plain_stag_text_with_crlf_is_normalized(self):
        raw = "Doplnění  znalostí.\r\n\r\n\r\n\r\nDruhý odstavec. \r\n"
        self.assertEqual(test_import.html_na_text(raw), "Doplnění znalostí.\n\nDruhý odstavec.")

    def test_comparison_sign_is_not_treated_as_tag(self):
        self.assertEqual(test_import.html_na_text("a < b a b > c"), "a < b a b > c")

    def test_empty_values_become_none(self):
        for raw in (None, "", "  \r\n ", "<p></p>"):
            self.assertIsNone(test_import.html_na_text(raw))

    def test_literature_list_is_split_into_lines(self):
        raw = "'Kubát J.: Počet. Praha, 1997.',\n'Calda E.: Matematika.'"
        self.assertEqual(test_import.literatura_na_text(raw), "Kubát J.: Počet. Praha, 1997.\nCalda E.: Matematika.")


class PeopleFormattingTest(unittest.TestCase):
    def test_quoted_list_with_titles(self):
        raw = "'Mgr. Jakub Baloun', 'RNDr. Marie Chodorová, Ph.D.'"
        self.assertEqual(test_import.osoby_na_text(raw), "Mgr. Jakub Baloun, RNDr. Marie Chodorová, Ph.D.")

    def test_single_person_and_plain_string(self):
        self.assertEqual(test_import.osoby_na_text("'prof. RNDr. Josef Molnár, CSc.'"), "prof. RNDr. Josef Molnár, CSc.")
        self.assertEqual(test_import.osoby_na_text("Doc. Jan Novák"), "Doc. Jan Novák")

    def test_multiple_sources_without_duplicates(self):
        self.assertEqual(test_import.osoby_na_text("'A', 'B'", "'B', 'C'"), "A, B, C")

    def test_empty_values(self):
        self.assertIsNone(test_import.osoby_na_text("", None, "''"))

    def test_long_list_is_truncated_on_name_boundary(self):
        text = ", ".join(f"Mgr. Učitel Číslo{i}" for i in range(30))
        short = test_import.zkrat(text)
        self.assertLessEqual(len(short), 255)
        self.assertTrue(short.endswith("…"))
        self.assertNotIn(", …", short)


class CompletionTypeMappingTest(unittest.TestCase):
    def test_typ_zk_values(self):
        cases = {
            "Zk": "Exam", "Zkouška": "Exam", "Zp": "Credit", "Zápočet": "Credit",
            "Kz": "Credit", "Klasifikovaný zápočet": "Credit", "Kolokvium": "Credit",
            "Zp+Zk": "Credit + Exam", "Zápočet a zkouška": "Credit + Exam",
        }
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(test_import.mapuj_typ_zakonceni(raw), expected)

    def test_falls_back_to_predmet_info(self):
        self.assertEqual(test_import.mapuj_typ_zakonceni(None, "Zkouška", "ANO"), "Credit + Exam")
        self.assertEqual(test_import.mapuj_typ_zakonceni(None, "Zkouška", "NE"), "Exam")
        self.assertEqual(test_import.mapuj_typ_zakonceni("", "Zápočet", "NE"), "Credit")

    def test_unknown_is_none(self):
        self.assertIsNone(test_import.mapuj_typ_zakonceni(None))
        self.assertIsNone(test_import.mapuj_typ_zakonceni("Něco", "Jiného"))


class GradePairingTest(unittest.TestCase):
    SUBJECTS = [
        {"zkratka": "MR", "katedra": "KMI", "nazev": "Repetitorium", "kredity": 3, "rok": "2026", "statut": "A",
         "typZk": None, "stavAbsolvovani": None},
        {"zkratka": "MR", "katedra": "KAG", "nazev": "Jiná katedra", "kredity": 3, "rok": "2026", "statut": "C"},
        {"zkratka": "ZP", "katedra": "KMI", "nazev": "Bez známky", "kredity": 5, "rok": "2026", "statut": "A"},
    ]
    GRADES = [
        {"zkratka": "MR", "katedra": "KMI", "rok": "2025", "semestr": "ZS", "zk_hodnoceni": "4"},
        {"zkratka": "MR", "katedra": "KMI", "rok": "2026", "semestr": "LS", "zk_hodnoceni": "3"},
        {"zkratka": "MR", "katedra": "KMI", "rok": "2026", "semestr": "ZS", "stavAbsolvovani": "U",
         "zppzk_hodnoceni": "S", "zppzk_datum": {"value": "18.12.2026"}, "zppzk_pokus": "1",
         "zppzk_ucit_jmeno": "Mgr. Jakub Baloun",
         "zk_hodnoceni": "1", "zk_datum": "20.1.2027", "zk_pokus": "2", "zk_body": "78,5",
         "zk_ucit_jmeno": "prof. RNDr. Josef Molnár, CSc."},
        {"zkratka": "MR", "katedra": "KAG", "rok": "2026", "semestr": "", "zk_hodnoceni": "B"},
    ]

    def test_pairs_by_code_department_year_and_semester(self):
        self.assertEqual(test_import.sparuj_znamku(self.SUBJECTS[0], self.GRADES, "ZS"), self.GRADES[2])
        # Prázdný semestr u známky se nekontroluje
        self.assertEqual(test_import.sparuj_znamku(self.SUBJECTS[1], self.GRADES, "ZS"), self.GRADES[3])
        self.assertIsNone(test_import.sparuj_znamku(self.SUBJECTS[2], self.GRADES, "ZS"))

    def test_transform_adds_results_and_converts_values(self):
        out = test_import.transformuj_predmety_pro_laravel(self.SUBJECTS, "ZS", {}, self.GRADES)

        first = out[0]
        self.assertEqual(first["creditResult"], "S")
        self.assertEqual(first["creditDate"], "2026-12-18")
        self.assertEqual(first["creditAttempt"], 1)
        self.assertEqual(first["creditExaminer"], "Mgr. Jakub Baloun")
        self.assertEqual(first["examResult"], "1")
        self.assertEqual(first["examDate"], "2027-01-20")
        self.assertEqual(first["examAttempt"], 2)
        self.assertEqual(first["examPoints"], 78.5)
        self.assertEqual(first["stagCompletionState"], "U")
        self.assertEqual(out[1]["examResult"], "B")

        # Předmět bez známky: výsledky explicitně null (ve STAGu nic není)
        self.assertIsNone(out[2]["examResult"])
        self.assertIsNone(out[2]["creditResult"])
        self.assertIsNone(out[2]["examAttempt"])

    def test_without_grades_result_keys_are_not_sent(self):
        out = test_import.transformuj_predmety_pro_laravel(self.SUBJECTS, "ZS", {}, None)
        for key in ("creditResult", "examResult", "examDate"):
            self.assertNotIn(key, out[0])
        self.assertNotIn("completionType", out[0])
        self.assertNotIn("lecturer", out[0])

    def test_transform_adds_subject_info(self):
        info = {("MR", "KMI", "2026"): {
            "garanti": "'prof. RNDr. Josef Molnár, CSc.'", "prednasejici": "",
            "cvicici": "'Mgr. Jakub Baloun', 'RNDr. Marie Chodorová, Ph.D.'", "seminarici": None,
            "anotace": "Doplnění.\r\n\r\n", "pozadavky": "<p>Písemka</p>", "prehledLatky": "1. výrazy\r\n2. funkce",
            "literatura": "'Kniha A',\n'Kniha B'", "metodyHodnotici": "Didaktický test",
            "formaZkousky": "Kombinovaná", "typZkousky": "Zkouška", "maZapocetPredZk": "ANO", "predmetUrl": None,
        }}
        first = test_import.transformuj_predmety_pro_laravel(self.SUBJECTS, "ZS", info, None)[0]

        self.assertEqual(first["completionType"], "Credit + Exam")
        self.assertEqual(first["guarantor"], "prof. RNDr. Josef Molnár, CSc.")
        self.assertIsNone(first["lecturers"])
        self.assertEqual(first["lecturer"], "prof. RNDr. Josef Molnár, CSc.")
        self.assertEqual(first["tutors"], "Mgr. Jakub Baloun, RNDr. Marie Chodorová, Ph.D.")
        self.assertEqual(first["stagAnnotation"], "Doplnění.")
        self.assertEqual(first["stagRequirements"], "Písemka")
        self.assertEqual(first["stagSyllabus"], "1. výrazy\n2. funkce")
        self.assertEqual(first["stagLiterature"], "Kniha A\nKniha B")
        self.assertEqual(first["examForm"], "Kombinovaná")
        self.assertTrue(first["creditBeforeExam"])
        self.assertIsNone(first["stagUrl"])
        # Druhý předmět (jiná katedra) info nemá → klíče chybí
        self.assertNotIn("guarantor", test_import.transformuj_predmety_pro_laravel(self.SUBJECTS, "ZS", info)[1])

    def test_dates_in_various_formats(self):
        self.assertEqual(test_import.datum_na_iso("5.2.2027 10:30"), "2027-02-05")
        self.assertEqual(test_import.datum_na_iso("2027-02-05T10:30:00"), "2027-02-05")
        self.assertEqual(test_import.datum_na_iso({"value": "05.02.2027"}), "2027-02-05")
        for raw in (None, "", "31.2.2027", "zítra"):
            self.assertIsNone(test_import.datum_na_iso(raw))


if __name__ == "__main__":
    unittest.main()
