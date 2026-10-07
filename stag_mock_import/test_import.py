import html
import os
import re
import sys
import unicodedata
from datetime import date, datetime
import requests

# --- KONFIGURACE (injected by StagSyncJob via environment variables) ---
# Používá je jen main(); funkce níže dostávají všechny hodnoty parametrem,
# aby šly importovat (např. ze stag_agent.py).
LARAVEL_API_URL  = os.environ.get("LARAVEL_API_URL",  "http://localhost/api")
BEARER_TOKEN     = os.environ.get("BEARER_TOKEN",     "")
STAG_TICKET      = os.environ.get("STAG_TICKET",      "")
STAG_USER        = os.environ.get("STAG_USER",        "")
STAG_STUDENT_ID  = os.environ.get("STAG_STUDENT_ID",  "")
STAG_WS_BASE_URL = os.environ.get("STAG_WS_BASE_URL", "https://stag-ws.upol.cz/ws")

DNY_MAP = {
    "Pondělí": 1, "Pondeli": 1, "Po": 1,
    "Úterý": 2, "Utery": 2, "Ut": 2,
    "Středa": 3, "Streda": 3, "St": 3,
    "Čtvrtek": 4, "Ctvrtek": 4, "Ct": 4,
    "Pátek": 5, "Patek": 5, "Pa": 5,
    "Sobota": 6, "So": 6,
    "Neděle": 7, "Nedele": 7, "Ne": 7,
}


class StagWsError(RuntimeError):
    """STAG WS vrátilo jiný stav než 200 (např. 401 = neplatný ticket)."""

    def __init__(self, status_code: int, text: str):
        super().__init__(f"Chyba při volání STAG WS (Status: {status_code}): {text}")
        self.status_code = status_code
        self.text = text


class ApiError(RuntimeError):
    """Laravel API vrátilo jiný stav než 200."""

    def __init__(self, message: str, status_code: int, text: str):
        super().__init__(f"{message} (Status: {status_code}): {text}")
        self.status_code = status_code
        self.text = text


def zjisti_aktualni_semestr() -> str:
    """Vrátí aktuální semestr (ZS pro září–leden, LS pro únor–srpen)."""
    mesic = date.today().month
    if mesic in (9, 10, 11, 12, 1):
        return "ZS"
    return "LS"


def stahni_predmety_ze_stagu(ticket: str, student_id: str, base_url: str, semestr: str) -> list:
    """Načte zapsané předměty studenta ze STAG Web Services.

    Vyhazuje StagWsError (stav != 200) nebo requests.RequestException (síť).
    """
    url = f"{base_url.rstrip('/')}/services/rest2/predmety/getPredmetyByStudent"
    params = {
        "osCislo": student_id,
        "semestr": semestr,
        "outputFormat": "JSON"
    }
    print(f"📡 Načítám předměty ze STAG WS pro studenta {student_id} (semestr: {semestr})...")
    response = requests.get(url, params=params, auth=(ticket, ""), timeout=15)
    if response.status_code != 200:
        raise StagWsError(response.status_code, response.text)
    data = response.json()
    return data.get("predmetStudenta", [])


def nacti_predmety_ze_stagu(ticket: str, student_id: str, base_url: str, semestr: str) -> list:
    """Načte zapsané předměty studenta ze STAG Web Services; při chybě ukončí skript."""
    try:
        return stahni_predmety_ze_stagu(ticket, student_id, base_url, semestr)
    except StagWsError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)
    except requests.RequestException as e:
        print(f"❌ Chyba sítě při komunikaci se STAG WS: {e}", file=sys.stderr)
        sys.exit(1)


def nacti_info_predmetu(ticket: str, base_url: str, zkratka: str, katedra: str, rok) -> dict:
    """Načte podrobnosti předmětu (garanti, vyučující, sylabus) z predmety/getPredmetInfo.

    Vyhazuje StagWsError (stav != 200), ValueError (neočekávaná odpověď)
    nebo requests.RequestException (síť).
    """
    url = f"{base_url.rstrip('/')}/services/rest2/predmety/getPredmetInfo"
    params = {"zkratka": zkratka, "katedra": katedra, "rok": rok, "outputFormat": "JSON"}
    response = requests.get(url, params=params, auth=(ticket, ""), timeout=15)
    if response.status_code != 200:
        raise StagWsError(response.status_code, response.text)
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("getPredmetInfo nevrátilo objekt")
    return data


def nacti_znamky(ticket: str, base_url: str, student_id: str) -> list:
    """Načte výsledky studenta (zápočty, zkoušky) ze znamky/getZnamkyByStudent.

    Vyhazuje StagWsError (stav != 200), ValueError (neočekávaná odpověď)
    nebo requests.RequestException (síť).
    """
    url = f"{base_url.rstrip('/')}/services/rest2/znamky/getZnamkyByStudent"
    params = {"osCislo": student_id, "outputFormat": "JSON"}
    print("📡 Načítám výsledky ze STAG WS...")
    response = requests.get(url, params=params, auth=(ticket, ""), timeout=15)
    if response.status_code != 200:
        raise StagWsError(response.status_code, response.text)
    data = response.json()
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("student_na_predmetu", []), list):
        return data.get("student_na_predmetu", [])
    raise ValueError("getZnamkyByStudent vrátilo neočekávaná data")


def _klic_predmetu(zkratka, katedra, rok) -> tuple:
    return (str(zkratka or ""), str(katedra or ""), str(rok or ""))


def _popis_chyby(e: Exception) -> str:
    # Tělo odpovědi STAGu do výpisu nepatří, stačí stav
    if isinstance(e, StagWsError):
        return f"Status: {e.status_code}"
    return type(e).__name__


def nacti_doplnky(ticket: str, base_url: str, student_id: str, surova_predmety: list):
    """Načte info o předmětech a výsledky studenta.

    Vrací (info_predmetu, znamky):
      - info_predmetu: {(zkratka, katedra, rok): dict} jen pro předměty, u kterých se info načetlo
      - znamky: seznam řádků, nebo None, pokud se výsledky načíst nepodařilo
    Žádné selhání sync neshodí; předmět se pak pošle bez příslušných klíčů.
    """
    chyby = (StagWsError, ValueError, requests.RequestException)
    info_predmetu = {}
    print(f"📡 Načítám podrobnosti {len(surova_predmety)} předmětů ze STAG WS...")
    for item in surova_predmety:
        zkratka, katedra, rok = item.get("zkratka"), item.get("katedra"), item.get("rok")
        if not (zkratka and katedra and rok):
            continue
        try:
            info_predmetu[_klic_predmetu(zkratka, katedra, rok)] = nacti_info_predmetu(
                ticket, base_url, zkratka, katedra, rok
            )
        except chyby as e:
            print(f"⚠️ Info o předmětu {katedra}/{zkratka} se nepodařilo načíst ({_popis_chyby(e)}).", file=sys.stderr)

    try:
        znamky = nacti_znamky(ticket, base_url, student_id)
    except chyby as e:
        print(f"⚠️ Výsledky se nepodařilo načíst ({_popis_chyby(e)}).", file=sys.stderr)
        znamky = None

    return info_predmetu, znamky


# ── Převody hodnot ze STAGu ─────────────────────────────────────────

_BLOK_KONEC_RE = re.compile(r"(?i)</(p|div|h[1-6]|ul|ol|table|tr|blockquote)\s*>")
_TAG_RE = re.compile(r"</?[a-zA-Z][^>]*>")


def html_na_text(hodnota):
    """Převede text ze STAGu (případně s HTML) na prostý text.

    HTML tagy pryč, odstavce jako prázdné řádky, normalizované mezery.
    Prázdný výsledek vrací jako None.
    """
    if hodnota is None:
        return None
    text = str(hodnota).replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)<li[^>]*>", "\n- ", text)
    text = _BLOK_KONEC_RE.sub("\n\n", text)
    text = _TAG_RE.sub("", text)
    text = html.unescape(text).replace("\xa0", " ")

    radky = [re.sub(r"[ \t\f\v]+", " ", radek).strip() for radek in text.split("\n")]
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(radky)).strip()
    return text or None


def _rozdel_seznam(hodnota):
    """STAG vrací seznamy jako "'A', 'B'"; vrátí ['A', 'B'], nebo None, když to seznam není."""
    if isinstance(hodnota, list):
        return [str(x).strip() for x in hodnota if str(x).strip()]
    if not isinstance(hodnota, str):
        return None
    s = hodnota.strip()
    if len(s) < 2 or s[0] != "'" or s[-1] != "'":
        return None
    return [x.strip() for x in re.split(r"'\s*,\s*'", s[1:-1]) if x.strip()]


def osoby_na_text(*hodnoty):
    """Jména s tituly oddělená čárkou (bez duplicit); prázdné → None."""
    jmena = []
    for hodnota in hodnoty:
        if hodnota is None:
            continue
        polozky = _rozdel_seznam(hodnota)
        if polozky is None:
            polozky = [str(hodnota).strip()] if str(hodnota).strip() else []
        for jmeno in polozky:
            jmeno = re.sub(r"\s+", " ", jmeno)
            if jmeno not in jmena:
                jmena.append(jmeno)
    return ", ".join(jmena) or None


def literatura_na_text(hodnota):
    """Seznam literatury v uvozovkách → jedna položka na řádek."""
    polozky = _rozdel_seznam(hodnota)
    if polozky is not None:
        hodnota = "\n".join(polozky)
    return html_na_text(hodnota)


def zkrat(text, max_delka: int = 255):
    """Zkrátí text na max_delka (backend má u těchto polí limit 255 znaků)."""
    if text is None or len(text) <= max_delka:
        return text
    oriznuto = text[: max_delka - 1]
    if ", " in oriznuto:
        oriznuto = oriznuto[: oriznuto.rfind(", ")]
    return oriznuto.rstrip(", ") + "…"


def _bez_diakritiky(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def _typ_zakonceni(hodnota):
    if not hodnota or not str(hodnota).strip():
        return None
    tokeny = set(re.split(r"[^a-z]+", _bez_diakritiky(str(hodnota)).lower())) - {""}
    zapocet = bool(tokeny & {"credit", "zp", "zapocet", "kz", "ko", "kolokvium"})
    zkouska = bool(tokeny & {"exam", "zk", "zkouska"})
    if zapocet and zkouska:
        return "Credit + Exam"
    if zkouska:
        return "Exam"
    if zapocet:
        return "Credit"
    return None


def mapuj_typ_zakonceni(typ_zk, typ_zkousky=None, zapocet_pred_zk=None):
    """typZk (getPredmetyByStudent), případně typZkousky + maZapocetPredZk (getPredmetInfo)
    na hodnoty frontendu: 'Credit', 'Exam', 'Credit + Exam'. Neznámé → None."""
    typ = _typ_zakonceni(typ_zk) or _typ_zakonceni(typ_zkousky)
    if typ == "Exam" and _ano_ne(zapocet_pred_zk):
        return "Credit + Exam"
    return typ


def _ano_ne(hodnota):
    if isinstance(hodnota, bool):
        return hodnota
    s = str(hodnota or "").strip().upper()
    if s in ("ANO", "A", "TRUE", "1"):
        return True
    if s in ("NE", "N", "FALSE", "0"):
        return False
    return None


def _text_nebo_none(hodnota):
    if hodnota is None:
        return None
    s = re.sub(r"\s+", " ", str(hodnota)).strip()
    return s or None


def datum_na_iso(hodnota):
    """'20.1.2027', '20.01.2027 10:00', {'value': ...} nebo ISO → '2027-01-20'; jinak None."""
    if isinstance(hodnota, dict):
        hodnota = hodnota.get("value")
    s = _text_nebo_none(hodnota)
    if not s:
        return None
    m = re.match(r"^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})", s)
    try:
        if m:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
        if m:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
    except ValueError:
        pass
    return None


def _cislo(hodnota, typ=int):
    s = _text_nebo_none(hodnota)
    if not s:
        return None
    try:
        return typ(s.replace(",", "."))
    except ValueError:
        return None


def sparuj_znamku(predmet: dict, znamky: list, semestr: str = ""):
    """Najde výsledek předmětu podle zkratka + katedra + rok (+ semestr, je-li u známky vyplněný)."""
    for radek in znamky or []:
        if str(radek.get("zkratka") or "") != str(predmet.get("zkratka") or ""):
            continue
        if predmet.get("katedra") and str(radek.get("katedra") or "") != str(predmet["katedra"]):
            continue
        if predmet.get("rok") and radek.get("rok") and str(radek["rok"]) != str(predmet["rok"]):
            continue
        if semestr and radek.get("semestr") and str(radek["semestr"]).upper() != semestr.upper():
            continue
        return radek
    return None


def _vysledky(radek) -> dict:
    """Výsledkové klíče pro Laravel; bez řádku jsou všechny None (výsledek ve STAGu není)."""
    radek = radek or {}
    zapocet = _text_nebo_none(radek.get("zppzk_hodnoceni"))
    zkouska = _text_nebo_none(radek.get("zk_hodnoceni"))
    return {
        "creditResult": zkrat(zapocet),
        "creditDate": datum_na_iso(radek.get("zppzk_datum")),
        "creditAttempt": _cislo(radek.get("zppzk_pokus")) if zapocet else None,
        "creditExaminer": zkrat(_text_nebo_none(radek.get("zppzk_ucit_jmeno"))),
        "examResult": zkrat(zkouska),
        "examDate": datum_na_iso(radek.get("zk_datum")),
        "examAttempt": _cislo(radek.get("zk_pokus")) if zkouska else None,
        "examPoints": _cislo(radek.get("zk_body"), float),
        "examExaminer": zkrat(_text_nebo_none(radek.get("zk_ucit_jmeno"))),
    }


def transformuj_predmety_pro_laravel(surova_data: list, semestr: str, info_predmetu: dict = None,
                                     znamky: list = None) -> list:
    """Transformuje surová data předmětů ze STAGu do formátu pro Laravel.

    info_predmetu a znamky jsou volitelné (viz nacti_doplnky). Klíče, pro které
    data nejsou, se vůbec nepošlou, takže je backend nepřepíše.
    """
    info_predmetu = info_predmetu or {}
    vysledek = []
    for item in surova_data:
        info = info_predmetu.get(_klic_predmetu(item.get("zkratka"), item.get("katedra"), item.get("rok")))
        predmet = {
            "code": item["zkratka"],
            "name": item["nazev"],
            "credits": item.get("kredity", 0),
            "department": item.get("katedra"),
            "semester": f"{semestr} {item.get('rok', '')}".strip(),
            "statut": item.get("statut"),
            "isMandatory": item.get("statut") == "A",
        }

        typ = mapuj_typ_zakonceni(
            item.get("typZk"),
            info.get("typZkousky") if info else None,
            info.get("maZapocetPredZk") if info else None,
        )
        if typ:
            predmet["completionType"] = typ

        if info is not None:
            garanti = osoby_na_text(info.get("garanti"))
            prednasejici = osoby_na_text(info.get("prednasejici"))
            predmet["lecturer"] = zkrat(prednasejici or garanti) or "Nespecifikováno"
            stag_url = _text_nebo_none(info.get("predmetUrl"))
            predmet.update({
                "guarantor": zkrat(garanti),
                "lecturers": prednasejici,
                "tutors": osoby_na_text(info.get("cvicici"), info.get("seminarici")),
                "stagAnnotation": html_na_text(info.get("anotace")),
                "stagRequirements": html_na_text(info.get("pozadavky")),
                "stagSyllabus": html_na_text(info.get("prehledLatky")),
                "stagLiterature": literatura_na_text(info.get("literatura")),
                "stagAssessment": html_na_text(info.get("metodyHodnotici")),
                "examForm": zkrat(_text_nebo_none(info.get("formaZkousky"))),
                "creditBeforeExam": _ano_ne(info.get("maZapocetPredZk")),
                "stagUrl": stag_url if stag_url and len(stag_url) <= 255 else None,
            })

        if znamky is not None:
            radek = sparuj_znamku(item, znamky, semestr)
            predmet.update(_vysledky(radek))
            stav = radek.get("stavAbsolvovani") if radek else item.get("stavAbsolvovani")
            predmet["stagCompletionState"] = zkrat(_text_nebo_none(stav))
        elif "stavAbsolvovani" in item:
            predmet["stagCompletionState"] = zkrat(_text_nebo_none(item.get("stavAbsolvovani")))

        vysledek.append(predmet)
    return vysledek


def _api_headers(bearer_token: str) -> dict:
    return {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


def posli_predmety_do_laravelu(api_url: str, bearer_token: str, data: list):
    """Odešle transformovaná data předmětů na chráněný endpoint /api/stag/sync-subjects.

    Vyhazuje ApiError (stav != 200) nebo requests.RequestException (síť).
    """
    url = f"{api_url}/stag/sync-subjects"

    print(f"📡 Odesílám {len(data)} předmětů na Laravel API...")
    response = requests.post(url, json=data, headers=_api_headers(bearer_token), timeout=10)
    if response.status_code == 200:
        print(f"🎉 Odezva serveru: {response.json().get('message')}")
    else:
        raise ApiError("Chyba při synchronizaci předmětů", response.status_code, response.text)


def odesli_predmety_do_laravelu(api_url: str, bearer_token: str, data: list):
    """Odešle předměty na Laravel API; při chybě ukončí skript."""
    try:
        posli_predmety_do_laravelu(api_url, bearer_token, data)
    except ApiError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)
    except requests.RequestException as e:
        print(f"❌ Chyba sítě při odesílání předmětů: {e}", file=sys.stderr)
        sys.exit(1)


def nacti_rozvrh_ze_stagu(ticket: str, student_id: str, base_url: str, semestr: str) -> list:
    """Načte rozvrhové akce studenta ze STAG Web Services."""
    url = f"{base_url.rstrip('/')}/services/rest2/rozvrhy/getRozvrhByStudent"
    params = {
        "osCislo": student_id,
        "semestr": semestr,
        "outputFormat": "JSON"
    }
    print(f"📡 Načítám rozvrh ze STAG WS pro studenta {student_id} (semestr: {semestr})...")
    response = requests.get(url, params=params, auth=(ticket, ""), timeout=15)
    if response.status_code != 200:
        raise StagWsError(response.status_code, response.text)
    data = response.json()
    return data.get("rozvrhovaAkce", [])


def rozbal_akci_na_terminy(akce: dict) -> list[date]:
    """Rozbalí rozvrhovou akci na seznam konkrétních kalendářních dat (datetime.date)."""
    den_nazev = akce.get("den") or akce.get("denZkr")
    if den_nazev not in DNY_MAP:
        print(f"⚠️ Neznámý den '{den_nazev}' u akce '{akce.get('nazev')}', přeskakuji.", file=sys.stderr)
        return []
    weekday_num = DNY_MAP[den_nazev]

    try:
        datum_od_str = akce["datumOd"]["value"] if isinstance(akce.get("datumOd"), dict) else akce["datumOd"]
        datum_do_str = akce["datumDo"]["value"] if isinstance(akce.get("datumDo"), dict) else akce["datumDo"]
        datum_od = datetime.strptime(datum_od_str, "%d.%m.%Y").date()
        datum_do = datetime.strptime(datum_do_str, "%d.%m.%Y").date()
    except (KeyError, TypeError, ValueError) as e:
        print(f"⚠️ Chyba při parsování data pro akci '{akce.get('nazev')}': {e}", file=sys.stderr)
        return []

    try:
        tyden_od = int(akce["tydenOd"])
        tyden_do = int(akce["tydenDo"])
    except (KeyError, TypeError, ValueError) as e:
        print(f"⚠️ Chybějící nebo neplatné týdny u akce '{akce.get('nazev')}': {e}", file=sys.stderr)
        return []

    candidate_years = []
    if "rok" in akce and akce["rok"]:
        try:
            candidate_years.append(int(akce["rok"]))
        except ValueError:
            pass
    for y in (datum_od.year, datum_do.year):
        if y not in candidate_years:
            candidate_years.append(y)

    tyden_typ = akce.get("tyden", "Jiný")
    terminy = []

    for tyden_num in range(tyden_od, tyden_do + 1):
        if tyden_typ == "Sudý" and tyden_num % 2 != 0:
            continue
        if tyden_typ == "Lichý" and tyden_num % 2 == 0:
            continue

        vypoctene_datum = None
        for rok_kand in candidate_years:
            try:
                d = date.fromisocalendar(rok_kand, tyden_num, weekday_num)
                if datum_od <= d <= datum_do:
                    vypoctene_datum = d
                    break
            except ValueError:
                continue

        if vypoctene_datum:
            terminy.append(vypoctene_datum)

    return terminy


def transformuj_rozvrh_pro_laravel(surova_data: list, subjects_by_code: dict, semestr: str = "") -> list:
    """Transformuje surová data rozvrhu ze STAGu do formátu pro Laravel endpoint /api/stag/sync-schedule."""
    vysledek = []
    for akce in surova_data:
        terminy = rozbal_akci_na_terminy(akce)
        kod = akce.get("predmet", "")
        nazev = akce.get("nazev", "")
        semestr_str = f"{akce.get('semestr') or semestr} {akce.get('rok', '')}".strip()

        start_time = akce.get("hodinaSkutOd", {}).get("value") if isinstance(akce.get("hodinaSkutOd"), dict) else akce.get("hodinaSkutOd")
        end_time = akce.get("hodinaSkutDo", {}).get("value") if isinstance(akce.get("hodinaSkutDo"), dict) else akce.get("hodinaSkutDo")
        room = f"{akce.get('budova', '')} {akce.get('mistnost', '')}".strip() or None
        teacher = akce.get("vsichniUciteleJmenaTituly") or None

        for terminus in terminy:
            vysledek.append({
                "subject": {
                    "code": kod,
                    "name": nazev,
                    "credits": subjects_by_code.get(kod, 0),
                    "department": akce.get("katedra"),
                    "lecturer": teacher or "Nespecifikováno",
                    "semester": semestr_str,
                    "completionType": "Credit",
                    "statut": akce.get("statut"),
                    "isMandatory": akce.get("statut") == "A"
                },
                "event": {
                    "title": f"{nazev} ({akce.get('typAkce', 'Akce')})",
                    "date": terminus.isoformat(),
                    "startTime": start_time or "00:00",
                    "endTime": end_time,
                    "type": akce.get("typAkce", "Přednáška"),
                    "room": room,
                    "teacherName": teacher
                }
            })
    return vysledek


def odesli_rozvrh_do_laravelu(api_url: str, bearer_token: str, data: list):
    """Odešle transformovaná data rozvrhu na chráněný endpoint /api/stag/sync-schedule.

    Vyhazuje ApiError (stav != 200) nebo requests.RequestException (síť).
    """
    url = f"{api_url}/stag/sync-schedule"

    print(f"📡 Odesílám {len(data)} rozvrhových událostí na Laravel API...")
    response = requests.post(url, json=data, headers=_api_headers(bearer_token), timeout=30)
    if response.status_code == 200:
        print(f"🎉 Odezva serveru: {response.json().get('message')}")
    else:
        raise ApiError("Chyba při synchronizaci rozvrhu", response.status_code, response.text)


def main():
    # 1. Validace povinných proměnných prostředí
    if not BEARER_TOKEN:
        print("❌ Chyba: BEARER_TOKEN není nastaven. Skript musí být spuštěn přes StagSyncJob.", file=sys.stderr)
        sys.exit(1)
    if not LARAVEL_API_URL:
        print("❌ Chyba: LARAVEL_API_URL není nastaven.", file=sys.stderr)
        sys.exit(1)
    if not STAG_TICKET:
        print("❌ Chyba: STAG_TICKET není nastaven.", file=sys.stderr)
        sys.exit(1)
    if not STAG_USER:
        print("❌ Chyba: STAG_USER není nastaven.", file=sys.stderr)
        sys.exit(1)
    if not STAG_STUDENT_ID:
        print("❌ Chyba: STAG_STUDENT_ID není nastaven.", file=sys.stderr)
        sys.exit(1)

    # 2. Zjištění semestru a načtení reálných předmětů ze STAG WS
    semestr = zjisti_aktualni_semestr()
    surova_predmety = nacti_predmety_ze_stagu(STAG_TICKET, STAG_STUDENT_ID, STAG_WS_BASE_URL, semestr)

    # 3. Podrobnosti a výsledky (selhání sync neshodí), transformace a odeslání předmětů
    info_predmetu, znamky = nacti_doplnky(STAG_TICKET, STAG_WS_BASE_URL, STAG_STUDENT_ID, surova_predmety)
    pripravene_predmety = transformuj_predmety_pro_laravel(surova_predmety, semestr, info_predmetu, znamky)

    if pripravene_predmety:
        odesli_predmety_do_laravelu(LARAVEL_API_URL, BEARER_TOKEN, pripravene_predmety)
    else:
        print("📭 Žádné předměty k odeslání.")

    # 4. Načtení, transformace a odeslání rozvrhu
    try:
        subjects_by_code = {p["zkratka"]: p.get("kredity", 0) for p in surova_predmety}
        surovy_rozvrh = nacti_rozvrh_ze_stagu(STAG_TICKET, STAG_STUDENT_ID, STAG_WS_BASE_URL, semestr)

        if surovy_rozvrh:
            pripraveny_rozvrh = transformuj_rozvrh_pro_laravel(surovy_rozvrh, subjects_by_code, semestr)
            if pripraveny_rozvrh:
                odesli_rozvrh_do_laravelu(LARAVEL_API_URL, BEARER_TOKEN, pripraveny_rozvrh)
            else:
                print("📭 Žádné rozvrhové události po rozbalení termínů k odeslání.")
        else:
            print("📭 Žádný rozvrh nebyl ze STAGu vrácen.")
    except Exception as e:
        # Selhání synchronizace rozvrhu nesmí shodit celý proces, pokud byly předměty v pořádku
        print(f"⚠️ Synchronizace rozvrhu selhala: {e}", file=sys.stderr)

    sys.exit(0)


if __name__ == "__main__":
    main()
