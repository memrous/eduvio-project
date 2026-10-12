# Eduvio

Eduvio je studijní webová aplikace, která studentům na jednom místě agreguje rozvrh, výsledky, studijní materiály a termíny ze **STAG** (Studijní agenda) a **Moodle**. Cílem je nabídnout přehledný dashboard místo přepínání mezi několika univerzitními systémy.

## Obsah

- [Architektura](#architektura)
- [Technologie](#technologie)
- [Struktura repozitáře](#struktura-repozitáře)
- [Požadavky](#požadavky)
- [Instalace a spuštění](#instalace-a-spuštění)
  - [Backend (Laravel)](#backend-laravel)
  - [Frontend (React)](#frontend-react)
  - [Spuštění přes Docker (Laravel Sail)](#spuštění-přes-docker-laravel-sail)
- [Produkční nasazení](#produkční-nasazení)
- [Integrace se STAG a Moodle](#integrace-se-stag-a-moodle)
- [Mock importy](#mock-importy)
- [API](#api)
- [Testy](#testy)

## Architektura

Projekt je rozdělený na dvě samostatné aplikace, které spolu komunikují přes REST API:

- **`eduvio-backend`** — Laravel API server (autentizace, databáze, synchronizace se STAG/Moodle, business logika)
- **`eduvio-frontend`** — React SPA (dashboard, rozvrh, předměty, materiály, profil)

## Technologie

**Backend**
- PHP 8.3, [Laravel 13](https://laravel.com/)
- Laravel Sanctum (token autentizace API)
- SQLite (výchozí lokální DB) / PostgreSQL (Docker/Sail)
- Laravel Sail (Docker vývojové prostředí)

**Frontend**
- React 19 + Vite
- React Router
- TanStack Query (React Query)
- Tailwind CSS 4
- GSAP (animace)
- i18next (lokalizace CZ/EN)
- Axios

**Integrace**
- Python skripty pro import dat ze STAG Web Services (`stag_mock_import`)
- Moodle Web Services volané přímo z PHP (`MoodleSyncJob`, `app/Services/Moodle`)

## Struktura repozitáře

```
eduvio-project/
├── eduvio-backend/        # Laravel API
│   ├── app/Http/Controllers/
│   ├── app/Models/
│   ├── database/migrations/
│   ├── routes/api.php
│   └── config/stag.php, moodle.php
├── eduvio-frontend/        # React SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/       # api.mock.js / api.real.js
│       └── i18n/
└── stag_mock_import/        # testovací import dat ze STAG
```

## Požadavky

- PHP >= 8.3 a Composer
- Node.js >= 18 a npm
- Python 3 (pro mock import skripty)
- Docker (volitelně, pro spuštění přes Laravel Sail)

## Instalace a spuštění

### Backend (Laravel)

```bash
cd eduvio-backend
composer install
cp .env.example .env
php artisan key:generate

# vytvoření SQLite databáze (výchozí nastavení)
touch database/database.sqlite
php artisan migrate

php artisan serve
```

Backend poběží na `http://localhost:8000`.

### Frontend (React)

```bash
cd eduvio-frontend
npm install
npm run dev
```

Frontend poběží na `http://localhost:5175` (viz `vite.config.js` / `package.json`).

### Spuštění přes Docker (Laravel Sail)

Backend obsahuje `compose.yaml` s Laravel Sail (PHP kontejner, PostgreSQL, Redis, queue worker) a rovnou mountuje složku `stag_mock_import` do kontejneru:

```bash
cd eduvio-backend
./vendor/bin/sail up
```

## Produkční nasazení

Šablona konfigurace je `eduvio-backend/.env.example` (produkční hodnoty), lokální přepisy pro Sail jsou v `eduvio-backend/.env.local.example`. Frontend má `eduvio-frontend/.env.example`.

### Procesy

Na serveru běží tři procesy backendu, všechny ze složky `eduvio-backend`:

| Proces | Příkaz | K čemu |
|---|---|---|
| web | PHP-FPM + nginx/Apache s kořenem `public/` | API (`/api/...`) a health check `/up` |
| queue worker | `php artisan queue:work --tries=1 --timeout=120` (pod supervisorem / systemd, restart při pádu) | synchronizace Moodle, STAG (režim server) a stránek předmětů |
| scheduler | cron `* * * * * cd /cesta/eduvio-backend && php artisan schedule:run` | noční Moodle sync (03:00), týdenní kontrola stránek předmětů |

STAG se v režimu `STAG_MODE=agent` neplánuje: synchronizuje ho agent na počítači studenta (viz níže).

`GET /up` odpovídá bez přihlášení a hodí se pro monitoring a load balancer.

### Trvalá data a klíč

- **Nahrané materiály** jsou na disku podle `MATERIALS_DISK`. V produkci `s3` = **Supabase Storage** přes S3 API:
  - v Supabase vytvořte **soukromý** bucket (např. `materials`) a v *Project Settings → Storage → S3 connection* S3 přístupové klíče,
  - do `.env` nastavte `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` (region projektu), `AWS_BUCKET`, `AWS_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3` a `AWS_USE_PATH_STYLE_ENDPOINT=true`.

  Soubory se nikdy neodkazují přímo: backend je streamuje z disku jen přes `GET /api/materials/{id}/file` s tokenem vlastníka (`php artisan storage:link` pro ně není potřeba). Lokálně stačí `MATERIALS_DISK=local` (`storage/app/private/materials`).
- **`storage/` musí být trvalý** (svazek / záloha): `storage/logs` s logy, s `MATERIALS_DISK=local` i nahrané materiály.
- **`APP_KEY` se po prvním nastavení nesmí měnit.** Šifruje uložený Moodle token a STAG ticket; s jiným klíčem je nejde přečíst a uživatelé se musí připojit znovu. Klíč zálohujte spolu s databází.
- Zálohujte databázi (PostgreSQL) a bucket s materiály (s `MATERIALS_DISK=local` složku `storage/app/private`).

### První spuštění

```bash
cd eduvio-backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
# vyplnit APP_URL, FRONTEND_URL, DB_*; klíč vygenerovat jen jednou:
php artisan key:generate

php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

Při přechodu ze starší verze, která ukládala materiály na veřejný disk, jednou spusťte `php artisan materials:move-to-private`. Soubory přesune na disk podle `MATERIALS_DISK` (tedy i do Supabase) a upraví záznamy; s `--dry-run` jen vypíše, co by přesunul.

**První účet:** registrace je v produkci vypnutá (`REGISTRATION_ENABLED=false`, `POST /api/register` vrací 403). Pro založení účtu ji dočasně zapněte (`REGISTRATION_ENABLED=true`, `php artisan config:cache`), zaregistrujte se a znovu ji vypněte. Případně ji omezte na doménu školy přes `REGISTRATION_ALLOWED_DOMAINS=upol.cz`. Přihlášení i registrace mají limit 5 pokusů za minutu na IP a e-mail.

### Každé další nasazení

```bash
php artisan down
git pull && composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache
php artisan queue:restart
php artisan up
```

Po změně `.env` je vždy potřeba znovu `php artisan config:cache` (s nacachovanou konfigurací se `.env` nečte).

### Frontend

Adresa API se do frontendu „zapéká“ při buildu:

```bash
cd eduvio-frontend
npm ci
VITE_API_BASE_URL=https://api.example.com/api npm run build
```

Výsledek je statická aplikace ve složce `dist/`. Webový server musí neznámé cesty vracet na `index.html` (SPA, např. v nginx `try_files $uri /index.html;`). `FRONTEND_URL` v backendu musí přesně odpovídat adrese, odkud se frontend načítá (CORS a návrat z přihlášení do STAGu/Moodle).

### STAG agent proti produkci

1. V aplikaci otevřete **Profil → Osobní údaje → IS/STAG** a vytvořte token agenta (zobrazí se jen jednou).
2. Na svém počítači ve složce `stag_mock_import`:

   ```bash
   python3 stag_agent.py setup    # API URL: https://api.example.com/api, token agenta
   python3 stag_agent.py login    # přihlášení do STAGu v prohlížeči
   python3 stag_agent.py          # synchronizace
   ```

3. Pravidelné spouštění (cron / Plánovač úloh) popisuje `stag_mock_import/AGENT.md`. Mimo `localhost` agent komunikuje jen přes HTTPS.

## Integrace se STAG a Moodle

Backend obsahuje dedikované konfigurace a controllery pro napojení na univerzitní systémy:

- **STAG** — `config/stag.php`, `StagController`, `StagAuthController`, `StagConnectController` — synchronizace rozvrhu, předmětů a výsledků, OAuth-like redirect flow (`STAG_WS_BASE_URL`).
- **Moodle** — `config/moodle.php`, `MoodleConnectController`, `MoodleSyncJob`, `app/Services/Moodle` — připojení přes Moodle mobile launch (wstoken), synchronizace úkolů a materiálů z kurzů voláním Moodle Web Services přímo z PHP (`MOODLE_BASE_URL`).

Relevantní proměnné prostředí (`.env`):

```
MOODLE_BASE_URL=https://moodle.upol.cz
STAG_WS_BASE_URL=https://stag-ws.upol.cz/ws
FRONTEND_URL=http://localhost:5173
```

## Mock importy

Složka `stag_mock_import/` obsahuje Python skript (`test_import.py`), který simuluje data ze STAGu a posílá je na Laravel API. Slouží k vývoji a testování synchronizace bez nutnosti reálného přístupu do STAGu. Konfiguruje se přes proměnné prostředí (např. `LARAVEL_API_URL`, `BEARER_TOKEN`, `STAG_TICKET` apod.), které mu za běhu předává `StagSyncJob`.

Moodle žádný mock import nemá: `MoodleSyncJob` volá Moodle Web Services přímo z PHP (`app/Services/Moodle`) s tokenem uživatele.

## API

Hlavní REST endpointy (`eduvio-backend/routes/api.php`):

| Oblast | Endpointy |
|---|---|
| Autentizace | `GET /config` (veřejné nastavení), `POST /register`, `POST /login`, `POST /logout`, `GET /user` |
| Předměty | `GET/POST/DELETE /subjects`, `GET /subjects/{id}` |
| Události | `GET/POST/PUT/PATCH/DELETE /events` |
| Požadavky | `GET/POST/PUT/DELETE /requirements` |
| Materiály | `GET/POST/DELETE /materials`, `GET /materials/{id}/file` (nahraný soubor, `?download=1`) |
| Dashboard | `GET /dashboard/summary` |
| STAG | `POST /stag/sync-schedule`, `POST /stag/sync-subjects`, `GET/POST/DELETE /user/stag*` |
| Moodle | `GET/POST/DELETE /user/moodle*` |

Chráněné endpointy vyžadují hlavičku `Authorization: Bearer <token>` (Laravel Sanctum).

## Testy

```bash
cd eduvio-backend
composer test
# nebo
php artisan test
```
