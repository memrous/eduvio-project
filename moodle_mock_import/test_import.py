import json
import os
import sys
import requests

# --- KONFIGURACE (injected by MoodleSyncJob via environment variables) ---
LARAVEL_API_URL = os.environ.get("LARAVEL_API_URL", "http://localhost/api")
BEARER_TOKEN    = os.environ.get("BEARER_TOKEN",    "")
MOODLE_URL      = os.environ.get("MOODLE_URL",      "")
MOODLE_WSTOKEN  = os.environ.get("MOODLE_WSTOKEN",  "")

def nacti_mock_moodle_data(soubor):
    """Načte JSON soubor s mockovanými daty z Moodle."""
    if not os.path.exists(soubor):
        print(f"❌ Chyba: Soubor {soubor} nebyl nalezen!", file=sys.stderr)
        return []
    with open(soubor, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("moodleCourses", [])

def transformuj_moodle_data(moodle_courses):
    """Transformuje Moodle kurzy a aktivity do payloadu pro Laravel API."""
    vysledek = []
    for kurz in moodle_courses:
        subject_code = kurz.get("subjectCode")
        activities = kurz.get("activities", [])

        for act in activities:
            item = {
                "subjectCode": subject_code,
                "requirement": {
                    "type": act.get("type", "homework"),
                    "title": act.get("title", "Aktivita z Moodle"),
                    "dueDate": act.get("due_date"),
                    "dueTime": act.get("due_time"),
                    "maxPoints": act.get("max_points"),
                    "gainedPoints": act.get("gained_points"),
                    "completed": act.get("completed", False),
                    "weight": act.get("weight"),
                    "grade": act.get("grade"),
                    "context": act.get("context", "Importováno z Moodle")
                }
            }
            vysledek.append(item)
    return vysledek

def odesli_moodle_data_do_laravelu(bearer_token, payload):
    """Odešle transformovaná Moodle data na callback endpoint v Laravelu."""
    url = f"{LARAVEL_API_URL}/moodle/sync-requirements"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    print(f"📡 Odesílám {len(payload)} Moodle aktivit na Laravel API...")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f"🎉 Odezva serveru: {response.json().get('message')}")
        else:
            print(f"❌ Chyba při synchronizaci Moodle (Status: {response.status_code}): {response.text}", file=sys.stderr)
            sys.exit(1)
    except requests.RequestException as e:
        print(f"❌ Chyba sítě při odesílání Moodle dat: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if not BEARER_TOKEN:
        print("❌ Chyba: BEARER_TOKEN není nastaven. Skript musí být spuštěn přes MoodleSyncJob.", file=sys.stderr)
        sys.exit(1)
    if not MOODLE_URL:
        print("❌ Chyba: MOODLE_URL není nastaven.", file=sys.stderr)
        sys.exit(1)
    if not MOODLE_WSTOKEN:
        print("❌ Chyba: MOODLE_WSTOKEN není nastaven.", file=sys.stderr)
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(script_dir, "mock_moodle_data.json")

    courses = nacti_mock_moodle_data(data_file)
    payload = transformuj_moodle_data(courses)

    if not payload:
        print("📭 Žádná Moodle data k odeslání.")
        sys.exit(0)

    odesli_moodle_data_do_laravelu(BEARER_TOKEN, payload)
