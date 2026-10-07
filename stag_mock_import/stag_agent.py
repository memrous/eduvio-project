#!/usr/bin/env python3
"""
Eduvio STAG agent.

STAG WS je dostupné jen ze sítě UPOL (VPN), takže v produkci nesynchronizuje
server, ale tento skript na notebooku uživatele: přihlásí se do STAGu (ticket),
stáhne předměty a rozvrh a pošle je na Eduvio API s tokenem agenta
(ability "stag:sync", vytvoří se v profilu aplikace).

Použití:
    python3 stag_agent.py setup           # uloží api_url, token agenta, STAG WS URL
    python3 stag_agent.py login           # přihlášení do STAGu (uloží ticket)
    python3 stag_agent.py                 # synchronizace
    python3 stag_agent.py --dry-run       # stáhne a převede data, nic neposílá
    python3 stag_agent.py --non-interactive   # pro plánovač úloh

Viz AGENT.md.
"""

import argparse
import base64
import getpass
import json
import os
import re
import sys
import threading
import time
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import requests

import test_import as stag

DEFAULT_STAG_WS_BASE_URL = "https://stag-ws.upol.cz/ws"
AGENT_HOME = Path.home() / ".eduvio-agent"
CONFIG_FILE = "config.json"
TICKET_FILE = "ticket.json"
LOGIN_TIMEOUT_SECONDS = 5 * 60
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
TICKET_EXPIRED_MESSAGE = "STAG ticket expired, run stag_agent.py login"

# Exit kódy (popsané v AGENT.md)
EXIT_OK = 0
EXIT_SYNC_FAILED = 1
EXIT_NO_VPN = 2
EXIT_CONFIG = 3
EXIT_LOGIN_REQUIRED = 4
EXIT_INTERRUPTED = 130


class AgentError(Exception):
    """Chyba, po které agent skončí s daným exit kódem."""

    def __init__(self, message: str, exit_code: int):
        super().__init__(message)
        self.exit_code = exit_code


class LoginRequired(Exception):
    """Ticket chybí nebo ho STAG odmítl."""


# ── Maskování tajných hodnot ────────────────────────────────────────

# Sanctum plain token má tvar "<id>|<40 znaků>"
_SANCTUM_TOKEN_RE = re.compile(r"\b\d+\|[A-Za-z0-9]{20,}")
_BEARER_RE = re.compile(r"(?i)(bearer\s+)\S+")
_TICKET_PARAM_RE = re.compile(r"(?i)(stagUserTicket=)[^&\s\"']+")


def mask_secrets(text, secrets=()) -> str:
    """Nahradí známé tajné hodnoty a vše, co vypadá jako token/ticket, za ***."""
    text = str(text)
    for secret in secrets:
        if secret and len(str(secret)) >= 4:
            text = text.replace(str(secret), "***")
    text = _SANCTUM_TOKEN_RE.sub("***", text)
    text = _BEARER_RE.sub(r"\1***", text)
    text = _TICKET_PARAM_RE.sub(r"\1***", text)
    return text


# ── Konfigurace a ticket (soubory jen pro vlastníka) ────────────────

def ensure_agent_home(home: Path) -> Path:
    home.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(home, 0o700)
    return home


def write_private_json(path: Path, data: dict) -> None:
    """Zapíše JSON s oprávněním 0600 (i když soubor už existoval s volnějším)."""
    ensure_agent_home(path.parent)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.chmod(path, 0o600)


def read_json(path: Path):
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_config(home: Path = AGENT_HOME) -> dict:
    config = read_json(home / CONFIG_FILE) or {}
    config.setdefault("stag_ws_base_url", DEFAULT_STAG_WS_BASE_URL)
    return config


def save_config(config: dict, home: Path = AGENT_HOME) -> None:
    write_private_json(home / CONFIG_FILE, {
        "api_url": config.get("api_url", ""),
        "agent_token": config.get("agent_token", ""),
        "stag_ws_base_url": config.get("stag_ws_base_url") or DEFAULT_STAG_WS_BASE_URL,
    })


def load_ticket(home: Path = AGENT_HOME):
    ticket = read_json(home / TICKET_FILE)
    if not ticket or not ticket.get("ticket") or not ticket.get("student_id"):
        return None
    return ticket


def save_ticket(ticket: str, user_name, student_id, home: Path = AGENT_HOME) -> dict:
    data = {
        "ticket": ticket,
        "user_name": user_name,
        "student_id": student_id,
        "obtained_at": datetime.now(timezone.utc).isoformat(),
    }
    write_private_json(home / TICKET_FILE, data)
    return data


def validate_api_url(api_url: str) -> str:
    """Normalizuje api_url; mimo localhost vyžaduje HTTPS."""
    api_url = (api_url or "").strip().rstrip("/")
    parsed = urlparse(api_url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise AgentError(f"Neplatná api_url: {api_url!r} (očekávám např. https://eduvio.example/api).", EXIT_CONFIG)
    if parsed.scheme != "https" and parsed.hostname not in LOCAL_HOSTS:
        raise AgentError(
            f"api_url {api_url} nepoužívá HTTPS. Mimo localhost se token posílá jen přes HTTPS.",
            EXIT_CONFIG,
        )
    return api_url


# ── STAG login: URL, stagUserInfo, callback ─────────────────────────

def build_login_url(ws_base_url: str, callback_url: str) -> str:
    """Stejně jako StagAuthController::redirect, jen s lokálním callbackem."""
    return f"{ws_base_url.rstrip('/')}/login?originalURL={quote(callback_url, safe='')}&longTicket=1"


def parse_stag_user_info(raw):
    """Vrátí (user_name, student_id) studentské role ('ST') ze stagUserInfo.

    Stejná logika jako StagAuthController::callback. Vyhazuje ValueError,
    pokud data nejdou dekódovat nebo chybí role studenta.
    """
    if not raw:
        raise ValueError("Chybí stagUserInfo.")
    # V query stringu se "+" mohlo změnit na mezeru
    raw = raw.strip().replace(" ", "+")
    try:
        decoded = json.loads(base64.b64decode(raw, validate=True).decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as e:
        raise ValueError(f"stagUserInfo nejde dekódovat: {e}") from None

    if isinstance(decoded, dict) and isinstance(decoded.get("stagUserInfo"), list):
        items = decoded["stagUserInfo"]
    elif isinstance(decoded, list):
        items = decoded
    else:
        items = [decoded]

    for item in items:
        if isinstance(item, dict) and item.get("role") == "ST":
            return item.get("userName"), item.get("osCislo")

    raise ValueError("Účet nemá ve STAGu roli studenta (ST).")


def extract_ticket_from_url(url: str):
    """Z URL callbacku (nebo jen jejího query stringu) vytáhne (ticket, stagUserInfo)."""
    url = (url or "").strip()
    query = urlparse(url).query if "?" in url else url
    params = parse_qs(query, keep_blank_values=True)
    ticket = (params.get("stagUserTicket") or [""])[0].strip()
    user_info = (params.get("stagUserInfo") or [""])[0]
    if not ticket or ticket == "anonymous":
        raise ValueError("V URL není platný stagUserTicket (přihlášení bylo zrušeno nebo URL není úplná).")
    return ticket, user_info


def store_login_result(url_or_query: str, home: Path) -> dict:
    ticket, user_info = extract_ticket_from_url(url_or_query)
    user_name, student_id = parse_stag_user_info(user_info)
    if not student_id:
        raise ValueError("stagUserInfo neobsahuje osobní číslo (osCislo).")
    return save_ticket(ticket, user_name, student_id, home)


_DONE_PAGE = """<!doctype html><html lang="cs"><meta charset="utf-8">
<title>Eduvio STAG agent</title>
<body style="font-family:sans-serif;max-width:32rem;margin:4rem auto;text-align:center">
<h1>{title}</h1><p>{text}</p></body></html>"""


def _make_callback_handler(home: Path, result: dict, done: threading.Event):
    class CallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if urlparse(self.path).path != "/callback":
                self.send_error(404)
                return
            try:
                ticket = store_login_result(self.path, home)
                result["ticket"] = ticket
                title, text = "Přihlášení dokončeno", "Můžeš okno zavřít a vrátit se do terminálu."
                status = 200
            except ValueError as e:
                result["error"] = str(e)
                title, text = "Přihlášení se nepodařilo", "Vrať se do terminálu a zkus to znovu."
                status = 400

            body = _DONE_PAGE.format(title=title, text=text).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            done.set()

        def log_message(self, format, *args):
            # Výchozí log by vypsal celou request line včetně ticketu
            pass

    return CallbackHandler


def login(config: dict, home: Path = AGENT_HOME) -> dict:
    """Interaktivní přihlášení do STAGu; uloží a vrátí ticket."""
    result = {}
    callback_done = threading.Event()
    enter_pressed = threading.Event()

    server = HTTPServer(("127.0.0.1", 0), _make_callback_handler(home, result, callback_done))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()

    def wait_for_enter():
        try:
            input()
        except EOFError:
            pass
        enter_pressed.set()

    try:
        login_url = build_login_url(config["stag_ws_base_url"], f"http://localhost:{port}/callback")
        print("🔐 Přihlášení do IS/STAG. Otevírám prohlížeč s touto adresou:")
        print(f"\n    {login_url}\n")
        print("   (Pokud se prohlížeč neotevřel, zkopíruj adresu ručně.)")
        print("   Po přihlášení se sem agent vrátí sám. Pro ruční vložení URL zmáčkni Enter.")
        webbrowser.open(login_url)

        threading.Thread(target=wait_for_enter, daemon=True).start()

        # Čekáme na callback, nebo na Enter (pak ruční vložení URL). Po 5 minutách
        # jen vyzveme k ručnímu vložení — stdin čte stále jen vlákno wait_for_enter.
        deadline = time.monotonic() + LOGIN_TIMEOUT_SECONDS
        timeout_announced = False
        while not callback_done.wait(timeout=0.5) and not enter_pressed.is_set():
            if not timeout_announced and time.monotonic() >= deadline:
                timeout_announced = True
                print("\n⏱️  Callback nepřišel do 5 minut. Zmáčkni Enter a vlož URL ručně.")
    finally:
        server.shutdown()
        server.server_close()

    if callback_done.is_set():
        if "ticket" in result:
            print(f"✅ Přihlášen jako {result['ticket']['user_name'] or '?'} ({result['ticket']['student_id']}).")
            return result["ticket"]
        print(f"❌ {result.get('error', 'Přihlášení se nepodařilo.')}", file=sys.stderr)

    return _manual_login(home)


def _manual_login(home: Path) -> dict:
    print("Po přihlášení zkopíruj z adresního řádku prohlížeče CELOU adresu")
    print("(http://localhost:…/callback?stagUserTicket=…) a vlož ji sem (vstup se nezobrazuje).")
    for _ in range(3):
        pasted = getpass.getpass("URL: ")
        try:
            ticket = store_login_result(pasted, home)
            print(f"✅ Přihlášen jako {ticket['user_name'] or '?'} ({ticket['student_id']}).")
            return ticket
        except ValueError as e:
            print(f"❌ {mask_secrets(e, [pasted])}", file=sys.stderr)
    raise AgentError("Přihlášení do STAGu se nepodařilo.", EXIT_LOGIN_REQUIRED)


# ── Eduvio API ──────────────────────────────────────────────────────

def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def whoami(api_url: str, token: str) -> dict:
    try:
        response = requests.get(f"{api_url}/stag/agent/whoami", headers=_auth_headers(token), timeout=10)
    except requests.RequestException as e:
        raise AgentError(f"Eduvio API ({api_url}) není dostupné: {mask_secrets(e, [token])}", EXIT_CONFIG)

    if response.status_code in (401, 403):
        raise AgentError(
            "Token agenta je neplatný nebo zrušený. Vytvoř nový v profilu aplikace "
            "a ulož ho přes `python3 stag_agent.py setup`.",
            EXIT_CONFIG,
        )
    if response.status_code != 200:
        raise AgentError(f"Eduvio API vrátilo neočekávaný stav {response.status_code}.", EXIT_CONFIG)
    return response.json()


def send_report(api_url: str, token: str, status: str, error=None, secrets=()) -> None:
    payload = {"status": status}
    if error:
        payload["error"] = mask_secrets(error, secrets)[:500]
    try:
        response = requests.post(
            f"{api_url}/stag/agent/report", json=payload, headers=_auth_headers(token), timeout=10,
        )
        if response.status_code != 200:
            print(f"⚠️  Report se nepodařilo odeslat (Status: {response.status_code}).", file=sys.stderr)
    except requests.RequestException as e:
        print(f"⚠️  Report se nepodařilo odeslat: {mask_secrets(e, [token, *secrets])}", file=sys.stderr)


# ── STAG WS ─────────────────────────────────────────────────────────

def check_vpn(ws_base_url: str) -> None:
    """Krátký request na STAG WS; jakákoli HTTP odpověď znamená, že je síť dostupná."""
    try:
        requests.get(ws_base_url.rstrip("/") + "/", timeout=5)
    except requests.RequestException:
        raise AgentError("Nejsi připojený k síti UPOL (VPN). STAG WS není dostupné.", EXIT_NO_VPN)


def fetch_subjects(ticket: dict, ws_base_url: str, semestr: str) -> list:
    try:
        return stag.stahni_predmety_ze_stagu(ticket["ticket"], ticket["student_id"], ws_base_url, semestr)
    except stag.StagWsError as e:
        if e.status_code == 401:
            raise LoginRequired() from None
        raise


# ── Sync ────────────────────────────────────────────────────────────

def run_sync(args, config: dict, home: Path) -> int:
    ws_base_url = config["stag_ws_base_url"]
    api_url = token = None

    # 1. API a token (v --dry-run se na API nic neposílá)
    if not args.dry_run:
        api_url = validate_api_url(args.api_url or config.get("api_url"))
        token = config.get("agent_token")
        if not token:
            raise AgentError("Chybí token agenta. Spusť `python3 stag_agent.py setup`.", EXIT_CONFIG)
        me = whoami(api_url, token)
        print(f"👤 Sync pro: {me.get('name')} <{me.get('email')}> → {api_url}")

    # 2. VPN — při jejím výpadku se report neposílá (nejde o chybu syncu)
    check_vpn(ws_base_url)

    ticket = load_ticket(home)
    secrets = [token, ticket and ticket.get("ticket")]

    def fail(message: str, exit_code: int = EXIT_SYNC_FAILED) -> int:
        print(f"❌ {mask_secrets(message, secrets)}", file=sys.stderr)
        if not args.dry_run:
            send_report(api_url, token, "failed", message, secrets)
        return exit_code

    try:
        # 3. Ticket
        semestr = stag.zjisti_aktualni_semestr()
        try:
            if ticket is None:
                raise LoginRequired()
            raw_subjects = fetch_subjects(ticket, ws_base_url, semestr)
        except LoginRequired:
            if args.non_interactive:
                return fail(TICKET_EXPIRED_MESSAGE, EXIT_LOGIN_REQUIRED)
            print("🔑 STAG ticket chybí nebo vypršel, je potřeba se přihlásit.")
            ticket = login(config, home)
            secrets.append(ticket["ticket"])
            raw_subjects = fetch_subjects(ticket, ws_base_url, semestr)

        # 4. Podrobnosti a výsledky předmětů (selhání sync neshodí), předměty, pak rozvrh
        subject_info, grades = stag.nacti_doplnky(ticket["ticket"], ws_base_url, ticket["student_id"], raw_subjects)
        subjects = stag.transformuj_predmety_pro_laravel(raw_subjects, semestr, subject_info, grades)
        credits_by_code = {p["zkratka"]: p.get("kredity", 0) for p in raw_subjects}
        raw_schedule = stag.nacti_rozvrh_ze_stagu(ticket["ticket"], ticket["student_id"], ws_base_url, semestr)
        schedule = stag.transformuj_rozvrh_pro_laravel(raw_schedule, credits_by_code, semestr) if raw_schedule else []

        if args.dry_run:
            with_info = sum(1 for s in subjects if "lecturers" in s)
            with_result = sum(1 for s in subjects if s.get("creditResult") or s.get("examResult"))
            print(f"🧪 Dry run: {len(subjects)} předmětů (s info: {with_info}, s výsledkem: {with_result}), "
                  f"{len(raw_schedule)} rozvrhových akcí → {len(schedule)} událostí. Nic se neodesílá.")
            return EXIT_OK

        if subjects:
            stag.posli_predmety_do_laravelu(api_url, token, subjects)
        else:
            print("📭 Žádné předměty k odeslání.")
        if schedule:
            stag.odesli_rozvrh_do_laravelu(api_url, token, schedule)
        else:
            print("📭 Žádné rozvrhové události k odeslání.")
    except LoginRequired:
        return fail(TICKET_EXPIRED_MESSAGE, EXIT_LOGIN_REQUIRED)
    except stag.StagWsError as e:
        # Celé tělo odpovědi do reportu nepatří, stačí stav
        return fail(f"STAG WS vrátilo chybu (Status: {e.status_code})")
    except stag.ApiError as e:
        return fail(f"Eduvio API odmítlo data (Status: {e.status_code})")
    except requests.RequestException as e:
        return fail(f"Chyba sítě: {type(e).__name__}")
    except AgentError as e:
        return fail(str(e), e.exit_code)
    except Exception as e:
        return fail(f"Neočekávaná chyba: {type(e).__name__}: {e}")

    # 5. Report
    send_report(api_url, token, "success")
    print("✅ Synchronizace dokončena.")
    return EXIT_OK


# ── Příkazy ─────────────────────────────────────────────────────────

def cmd_setup(home: Path) -> int:
    config = load_config(home)
    print(f"Nastavení agenta (uloží se do {home / CONFIG_FILE}).")

    default_api = config.get("api_url") or "https://"
    while True:
        api_url = input(f"Eduvio API URL [{default_api}]: ").strip() or default_api
        try:
            config["api_url"] = validate_api_url(api_url)
            break
        except AgentError as e:
            print(f"❌ {e}")

    has_token = bool(config.get("agent_token"))
    prompt = "Token agenta (z profilu aplikace" + (", Enter = ponechat stávající" if has_token else "") + "): "
    token = getpass.getpass(prompt).strip()
    if token:
        config["agent_token"] = token
    elif not has_token:
        print("❌ Token je povinný.", file=sys.stderr)
        return EXIT_CONFIG

    ws = input(f"STAG WS URL [{config['stag_ws_base_url']}]: ").strip()
    if ws:
        config["stag_ws_base_url"] = ws.rstrip("/")

    save_config(config, home)
    print("💾 Uloženo.")

    try:
        me = whoami(config["api_url"], config["agent_token"])
        print(f"✅ Token platí pro: {me.get('name')} <{me.get('email')}>")
    except AgentError as e:
        print(f"⚠️  {e}")
    return EXIT_OK


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Eduvio STAG agent — synchronizace STAGu přes VPN UPOL.")
    parser.add_argument("command", nargs="?", choices=["sync", "setup", "login"], default="sync")
    parser.add_argument("--non-interactive", action="store_true",
                        help="nikdy neotevírat prohlížeč ani se na nic neptat (plánovač úloh)")
    parser.add_argument("--dry-run", action="store_true", help="stáhnout a převést data, nic neposílat")
    parser.add_argument("--api-url", help="jednorázově přepsat api_url z konfigurace")
    return parser.parse_args(argv)


def main(argv=None, home: Path = AGENT_HOME) -> int:
    args = parse_args(argv)
    try:
        if args.command == "setup":
            if args.non_interactive:
                raise AgentError("setup je interaktivní, nejde s --non-interactive.", EXIT_CONFIG)
            return cmd_setup(home)

        config = load_config(home)

        if args.command == "login":
            if args.non_interactive:
                raise AgentError("login je interaktivní, nejde s --non-interactive.", EXIT_CONFIG)
            check_vpn(config["stag_ws_base_url"])
            login(config, home)
            return EXIT_OK

        return run_sync(args, config, home)
    except AgentError as e:
        print(f"❌ {mask_secrets(e)}", file=sys.stderr)
        return e.exit_code
    except KeyboardInterrupt:
        print("\nPřerušeno.", file=sys.stderr)
        return EXIT_INTERRUPTED


if __name__ == "__main__":
    sys.exit(main())
