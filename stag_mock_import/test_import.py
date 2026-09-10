import os
import sys
from datetime import date
import requests

# --- KONFIGURACE (injected by StagSyncJob via environment variables) ---
LARAVEL_API_URL  = os.environ.get("LARAVEL_API_URL",  "http://localhost/api")
BEARER_TOKEN     = os.environ.get("BEARER_TOKEN",     "")
STAG_TICKET      = os.environ.get("STAG_TICKET",      "")
STAG_USER        = os.environ.get("STAG_USER",        "")
STAG_STUDENT_ID  = os.environ.get("STAG_STUDENT_ID",  "")
STAG_WS_BASE_URL = os.environ.get("STAG_WS_BASE_URL", "https://stag-ws.upol.cz/ws")


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
            print(f"❌ Chyba při synchronizaci (Status: {response.status_code}): {response.text}", file=sys.stderr)
            sys.exit(1)
    except requests.RequestException as e:
        print(f"❌ Chyba sítě při odesílání dat: {e}", file=sys.stderr)
        sys.exit(1)


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
    surova_data = nacti_predmety_ze_stagu(STAG_TICKET, STAG_STUDENT_ID, STAG_WS_BASE_URL, semestr)

    # 3. Transformace dat pro nový endpoint
    pripravena_data = transformuj_predmety_pro_laravel(surova_data, semestr)

    if not pripravena_data:
        print("📭 Žádné předměty k odeslání.")
        sys.exit(0)

    # 4. Odeslání do Laravelu
    odesli_predmety_do_laravelu(BEARER_TOKEN, pripravena_data)
