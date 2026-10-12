# Eduvio STAG agent

IS/STAG Web Services jsou dostupné jen ze sítě UPOL (VPN), takže produkční server
se k nim nedostane. Synchronizaci proto dělá **agent** – skript `stag_agent.py`
na tvém počítači připojeném k VPN UPOL:

1. ověří token agenta u Eduvio API (`GET /stag/agent/whoami`),
2. zkontroluje, že je dostupné STAG WS (= jsi na VPN),
3. použije uložený STAG ticket, nebo tě nechá přihlásit,
4. stáhne předměty, rozvrh a vypsané termíny zkoušek, převede je a pošle na API
   (když se termíny načíst nepodaří, sync pokračuje a v aplikaci zůstanou ty předchozí),
5. nahlásí výsledek (`POST /stag/agent/report`) – uvidíš ho v profilu aplikace.

Data se stahují a převádějí stejným kódem jako při serverové synchronizaci
(`test_import.py`).

## Instalace

Potřebuješ Python 3.10+ a knihovnu `requests`. Na Windows doporučujeme WSL.

```bash
pip install requests
cd eduvio-project/stag_mock_import
```

## 1. Nastavení (`setup`)

1. V aplikaci otevři **Profil → IS/STAG** a vytvoř token agenta.
   Token se zobrazí jen jednou. Nový token vždy zneplatní ten předchozí.
2. Spusť:

   ```bash
   python3 stag_agent.py setup
   ```

   Agent se zeptá na:
   - **API URL** – např. `https://eduvio.example.cz/api`, lokálně `http://localhost/api`,
   - **token agenta** – vkládá se skrytě, nezobrazuje se,
   - **STAG WS URL** – výchozí `https://stag-ws.upol.cz/ws`.

   Na konci ověří token a vypíše, pro koho platí.

Konfigurace se ukládá do `~/.eduvio-agent/config.json`, ticket do
`~/.eduvio-agent/ticket.json`. Složka má oprávnění `0700`, soubory `0600`
(přístup má jen vlastník).

Mimo `localhost` agent komunikuje s API **jen přes HTTPS**. Adresu `http://…`
na jiný server odmítne.

## 2. Přihlášení do STAGu (`login`)

```bash
python3 stag_agent.py login
```

- Agent spustí lokální server na `127.0.0.1` a otevře přihlášení do STAGu
  v prohlížeči. Adresu vždy vypíše i do terminálu, protože ve WSL se prohlížeč
  nemusí otevřít sám. V tom případě ji zkopíruj do prohlížeče ve Windows.
- Po přihlášení tě STAG přesměruje na `http://localhost:<port>/callback`
  a agent si uloží ticket, osobní číslo a uživatelské jméno.
- Když se stránka po přihlášení nenačte (callback nepřijde do 5 minut), nebo
  když zmáčkneš Enter, agent nabídne **ruční vložení**: zkopíruj z adresního
  řádku celou adresu `http://localhost:…/callback?stagUserTicket=…` a vlož ji.
  Vstup se nezobrazuje.

Login se spustí i automaticky při běžném syncu, pokud ticket chybí nebo ho
STAG odmítne. Výjimkou je režim `--non-interactive`.

## 3. Synchronizace

```bash
python3 stag_agent.py                 # sync (totéž co: python3 stag_agent.py sync)
python3 stag_agent.py --dry-run       # stáhne a převede data, vypíše počty, nic neposílá
python3 stag_agent.py --api-url http://localhost/api   # jednorázově jiné API
```

`--dry-run` nekontaktuje Eduvio API vůbec (ani `whoami`, ani report). Stačí mu
VPN a STAG ticket.

Kromě předmětů a rozvrhu agent stahuje i podrobnosti předmětů
(`predmety/getPredmetInfo`: garanti, vyučující, sylabus) a výsledky
(`znamky/getZnamkyByStudent`). Když se info o předmětu nebo výsledky nepodaří
načíst, sync pokračuje a předmět se pošle bez těchto údajů (Eduvio nechá
dříve uložené hodnoty). `--dry-run` vypíše, u kolika předmětů se info
a výsledek načetly.

## 4. Běh na pozadí (`watch`) – doporučeno

```bash
python3 stag_agent.py watch
```

Agent běží trvale a sám rozhoduje, kdy synchronizovat:

- Každých **90 s** se zeptá serveru (`GET /stag/agent/pending`), jestli jsi
  v aplikaci nezmáčkl **Synchronizovat teď**. Server se k notebooku nikdy
  nepřipojuje, ptá se jen agent. Aplikace podle těchto dotazů ukazuje
  „Notebook online“ (dotaz za posledních 5 minut).
- Sync spustí, když ho vyžádáš v aplikaci (do ~2 minut), nebo když od
  posledního pokusu uplynul interval (výchozí **60 min**, změníš ho
  v `~/.eduvio-agent/config.json` klíčem `"sync_interval_minutes": 30`).
- Před syncem ověří, že je dostupné STAG WS. Když nejsi na **VPN UPOL / eduroamu**,
  sync odloží: nic neposílá a vyžádaný sync počká, až se připojíš.
- Když ticket do STAGu chybí nebo vypršel, otevře přihlášení do STAGu
  v prohlížeči (nejvýš jednou za 12 hodin) a do té doby hlásí v aplikaci
  „Přihlas se do STAGu na notebooku“. Přihlášení můžeš kdykoli udělat i ručně
  příkazem `python3 stag_agent.py login`.
- Výpadek sítě nebo serveru agenta neukončí: zkouší to dál s rostoucí pauzou
  (90 s → 3 → 6 → max. 10 min).
- Běží jen jedna instance (zámek `~/.eduvio-agent/agent.lock`). Další `watch`
  skončí s kódem 5.
- Log: `~/.eduvio-agent/agent.log` (rotuje se po ~1 MB, 2 zálohy). Tokeny ani
  tickety v něm nejsou.
- Ukončení: Ctrl+C, nebo `SIGTERM` (např. `pkill -f "stag_agent.py watch"`).

### Automatické spuštění ve Windows

Skript ve složce `windows/` vytvoří v Plánovači úloh úlohu **Eduvio STAG agent**:
spustí `wsl.exe -d <distro> -- python3 <cesta>/stag_agent.py watch` skrytě
(bez okna konzole) **při přihlášení do Windows** a každých 15 minut ji zkusí
spustit znovu, kdyby agent spadl.

1. Ve WSL nejdřív jednou nastav agenta a přihlas se do STAGu (body 1 a 2).
2. Otevři **PowerShell ve Windows** (Start → „PowerShell“, bez správce)
   a spusť instalaci. `-ExecutionPolicy Bypass` povolí spuštění jen tohoto
   skriptu, nastavení systému se nemění:

   ```powershell
   cd \\wsl.localhost\Ubuntu\home\<uzivatel>\eduvio-project\stag_mock_import\windows
   powershell -ExecutionPolicy Bypass -File .\install-agent.ps1 -StartNow
   ```

   Distribuci WSL a cestu k agentovi skript zjistí z umístění skriptu. Jinak je
   předej parametry `-Distro Ubuntu -AgentPath /home/<uzivatel>/eduvio-project/stag_mock_import/stag_agent.py`.
   Na starších Windows bez `conhost --headless` použij `-NoHeadless`
   (zůstane otevřené okno konzole).
3. Do ~2 minut ukáže aplikace v profilu „Notebook online“.

Odinstalace (zastaví i běžícího agenta, konfigurace a ticket zůstanou):

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall-agent.ps1
```

### Alternativa: jednorázový sync v plánovači

Bez `watch` jde agent spouštět i jednorázově s `--non-interactive`. Na nic se
neptá a prohlížeč neotevře. Když ticket vyprší, pošle report `failed`
s hláškou „STAG ticket expired, run stag_agent.py login“ a skončí s kódem 4.

```bat
schtasks /Create /TN "Eduvio STAG sync" /SC DAILY /ST 07:00 ^
  /TR "C:\Windows\System32\wsl.exe -d Ubuntu -- python3 /home/<uzivatel>/eduvio-project/stag_mock_import/stag_agent.py --non-interactive"
```

Poznámka k VPN a WSL: WSL 2 používá síť Windows, takže stačí být připojený
k VPN ve Windows. Pokud agent i s VPN hlásí „Nejsi připojený k síti UPOL“,
zkus ve `%UserProfile%\.wslconfig` nastavit `networkingMode=mirrored`
(sekce `[wsl2]`) a restartovat WSL (`wsl --shutdown`).

## Exit kódy

| Kód | Význam | Report do aplikace |
|---|---|---|
| 0 | Synchronizace proběhla (nebo `--dry-run`, `setup`, `login` OK; `watch` po Ctrl+C / SIGTERM) | `success` (ne u `--dry-run`) |
| 1 | Synchronizace selhala (chyba STAG WS, API, sítě) | `failed` se stručnou chybou |
| 2 | Nejsi připojený k síti UPOL (VPN) | neposílá se – nejde o chybu syncu |
| 3 | Chyba konfigurace nebo API: chybí `setup`, neplatný/zrušený token, `http://` mimo localhost, API nedostupné | neposílá se |
| 4 | Je potřeba se přihlásit do STAGu (`--non-interactive`, nebo se přihlášení nepodařilo) | `failed` („STAG ticket expired…“, ve `watch` „Přihlas se do STAGu na notebooku“) |
| 5 | `watch` už běží (jiná instance drží zámek) | neposílá se |
| 130 | Přerušeno uživatelem (Ctrl+C) | neposílá se |

## Bezpečnost

- Token agenta smí jen nahrávat data ze STAGu a hlásit výsledek. Na ostatní
  části API nemá přístup. Zrušit ho můžeš kdykoli v profilu aplikace.
- Ticket ani token agent nikdy nevypisuje ani neposílá v reportu. Chybové
  hlášky se před výpisem i odesláním maskují.
- Do reportu jde jen stručná chyba (např. stav HTTP), nikdy celé tělo
  odpovědi ze STAGu nebo API.

## Testy

```bash
cd stag_mock_import
python3 -m unittest test_stag_agent -v
```

Testy nepotřebují síť (HTTP volání jsou mockovaná).
