import os
import sys
from datetime import date, datetime
import requests

# --- KONFIGURACE (injected by StagSyncJob via environment variables) ---
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


def zjisti_aktualni_semestr() -> str:
    """Vrátí aktuální semestr (ZS pro září–leden, LS pro únor–srpen)."""
    mesic = date.today().month
    if mesic in (9, 10, 11, 12, 1):
        return "ZS"
    return "LS"


def nacti_predmety_ze_stagu(ticket: str, student_id: str, base_url: str, semestr: str) -> list:
    """Načte zapsané předměty studenta ze STAG Web Services."""
    url = f"{base_url.rstrip('/')}/services/rest2/predmety/getPredmetyByStudent"
    params = {
        "osCislo": student_id,
        "semestr": semestr,
        "outputFormat": "JSON"
    }
    print(f"📡 Načítám předměty ze STAG WS pro studenta {student_id} (semestr: {semestr})...")
    try:
        response = requests.get(url, params=params, auth=(ticket, ""), timeout=15)
        if response.status_code != 200:
            print(f"❌ Chyba při volání STAG WS (Status: {response.status_code}): {response.text}", file=sys.stderr)
            sys.exit(1)
        data = response.json()
        return data.get("predmetStudenta", [])
    except requests.RequestException as e:
        print(f"❌ Chyba sítě při komunikaci se STAG WS: {e}", file=sys.stderr)
        sys.exit(1)


def transformuj_predmety_pro_laravel(surova_data: list, semestr: str) -> list:
    """Transformuje surová data předmětů ze STAGu do formátu pro Laravel."""
    vysledek = []
    for item in surova_data:
        vysledek.append({
            "code": item["zkratka"],
            "name": item["nazev"],
            "credits": item.get("kredity", 0),
            "semester": f"{semestr} {item.get('rok', '')}".strip(),
            "completionType": "Credit",
            "isMandatory": item.get("statut") == "A",
            "lecturer": "Nespecifikováno"
        })
    return vysledek


def odesli_predmety_do_laravelu(bearer_token: str, data: list):
    """Odešle transformovaná data předmětů na chráněný endpoint /api/stag/sync-subjects."""
    url = f"{LARAVEL_API_URL}/stag/sync-subjects"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    print(f"📡 Odesílám {len(data)} předmětů na Laravel API...")
    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f"🎉 Odezva serveru: {response.json().get('message')}")
        else:
            print(f"❌ Chyba při synchronizaci předmětů (Status: {response.status_code}): {response.text}", file=sys.stderr)
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
        raise RuntimeError(f"Chyba při volání STAG WS (Status: {response.status_code}): {response.text}")
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
                    "lecturer": teacher or "Nespecifikováno",
                    "semester": semestr_str,
                    "completionType": "Credit",
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


def odesli_rozvrh_do_laravelu(bearer_token: str, data: list):
    """Odešle transformovaná data rozvrhu na chráněný endpoint /api/stag/sync-schedule."""
    url = f"{LARAVEL_API_URL}/stag/sync-schedule"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    print(f"📡 Odesílám {len(data)} rozvrhových událostí na Laravel API...")
    response = requests.post(url, json=data, headers=headers, timeout=30)
    if response.status_code == 200:
        print(f"🎉 Odezva serveru: {response.json().get('message')}")
    else:
        raise RuntimeError(f"Chyba při synchronizaci rozvrhu (Status: {response.status_code}): {response.text}")


if __name__ == "__main__":
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

    # 3. Transformace a odeslání předmětů
    pripravene_predmety = transformuj_predmety_pro_laravel(surova_predmety, semestr)

    if pripravene_predmety:
        odesli_predmety_do_laravelu(BEARER_TOKEN, pripravene_predmety)
    else:
        print("📭 Žádné předměty k odeslání.")

    # 4. Načtení, transformace a odeslání rozvrhu
    try:
        subjects_by_code = {p["zkratka"]: p.get("kredity", 0) for p in surova_predmety}
        surovy_rozvrh = nacti_rozvrh_ze_stagu(STAG_TICKET, STAG_STUDENT_ID, STAG_WS_BASE_URL, semestr)

        if surovy_rozvrh:
            pripraveny_rozvrh = transformuj_rozvrh_pro_laravel(surovy_rozvrh, subjects_by_code, semestr)
            if pripraveny_rozvrh:
                odesli_rozvrh_do_laravelu(BEARER_TOKEN, pripraveny_rozvrh)
            else:
                print("📭 Žádné rozvrhové události po rozbalení termínů k odeslání.")
        else:
            print("📭 Žádný rozvrh nebyl ze STAGu vrácen.")
    except Exception as e:
        # Selhání synchronizace rozvrhu nesmí shodit celý proces, pokud byly předměty v pořádku
        print(f"⚠️ Synchronizace rozvrhu selhala: {e}", file=sys.stderr)

    sys.exit(0)
