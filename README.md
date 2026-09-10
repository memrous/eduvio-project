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
- Python skripty pro import dat ze STAG Web Services a Moodle (`stag_mock_import`, `moodle_mock_import`)

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
├── stag_mock_import/        # testovací import dat ze STAG
└── moodle_mock_import/      # testovací import dat z Moodle
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

Backend obsahuje `compose.yaml` s Laravel Sail (PHP kontejner, PostgreSQL, Redis, queue worker) a rovnou mountuje složky `stag_mock_import` a `moodle_mock_import` do kontejneru:

```bash
cd eduvio-backend
./vendor/bin/sail up
```

## Integrace se STAG a Moodle

Backend obsahuje dedikované konfigurace a controllery pro napojení na univerzitní systémy:

- **STAG** — `config/stag.php`, `StagController`, `StagAuthController`, `StagConnectController` — synchronizace rozvrhu, předmětů a výsledků, cooldown na manuální resync, OAuth-like redirect flow (`STAG_WS_BASE_URL`).
- **Moodle** — `config/moodle.php`, `MoodleController`, `MoodleConnectController` — synchronizace požadavků/aktivit z kurzů (`MOODLE_BASE_URL`).

Relevantní proměnné prostředí (`.env`):

```
MOODLE_BASE_URL=https://moodle.upol.cz
STAG_WS_BASE_URL=https://stag-ws.upol.cz/ws
STAG_RESYNC_COOLDOWN_MINUTES=30
MOODLE_RESYNC_COOLDOWN_MINUTES=30
FRONTEND_URL=http://localhost:5173
```

## Mock importy

Složky `stag_mock_import/` a `moodle_mock_import/` obsahují Python skripty (`test_import.py`), které simulují data z reálných univerzitních systémů a posílají je na Laravel API. Slouží k vývoji a testování synchronizace bez nutnosti reálného přístupu do STAG/Moodle. Konfigurují se přes proměnné prostředí (např. `LARAVEL_API_URL`, `BEARER_TOKEN`, `STAG_TICKET`, `MOODLE_URL` apod.), které jim za běhu předává příslušný Laravel job (`StagSyncJob`, `MoodleSyncJob`).

## API

Hlavní REST endpointy (`eduvio-backend/routes/api.php`):

| Oblast | Endpointy |
|---|---|
| Autentizace | `POST /register`, `POST /login`, `POST /logout`, `GET /user` |
| Předměty | `GET/POST/DELETE /subjects`, `GET /subjects/{id}` |
| Události | `GET/POST/PUT/PATCH/DELETE /events` |
| Požadavky | `GET/POST/PUT/DELETE /requirements` |
| Materiály | `GET/POST/DELETE /materials` |
| Dashboard | `GET /dashboard/summary` |
| STAG | `POST /stag/sync-schedule`, `POST /stag/sync-subjects`, `GET/POST/DELETE /user/stag*` |
| Moodle | `POST /moodle/sync-requirements`, `GET/POST/DELETE /user/moodle*` |

Chráněné endpointy vyžadují hlavičku `Authorization: Bearer <token>` (Laravel Sanctum).

## Testy

```bash
cd eduvio-backend
composer test
# nebo
php artisan test
```
