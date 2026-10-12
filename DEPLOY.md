# Nasazení Eduvia zdarma

Návod krok za krokem. Na konci poběží:

| Část | Služba | Co tam běží |
|---|---|---|
| Backend (API) | **Render** – free web service z `eduvio-backend/Dockerfile` | web, fronta úloh i plánovač v jednom kontejneru |
| Databáze | **Supabase** Postgres | připojení přes pooler |
| Soubory | **Supabase Storage** (S3 API) | nahrané materiály |
| Frontend | **Vercel** | statický build Vite |
| Udržení vzhůru | **cron-job.org** | ping `/up` každých 10 minut |
| STAG | **agent na tvém notebooku** | server se ke STAGu nepřipojuje (`STAG_MODE=agent`) |

V repu je všechno připravené (`render.yaml`, `Dockerfile`, `vercel.json`). Zbývá
založit účty a vyplnit proměnné. Počítej zhruba s hodinou.

> **Tip:** Všechny hesla a klíče, které během návodu vzniknou, si hned ukládej do
> správce hesel (Bitwarden, 1Password, KeePass…). Některé se zobrazí jen jednou.

---

## a) Supabase: databáze a úložiště souborů

1. Na [supabase.com](https://supabase.com) se zaregistruj a dej **New project**.
   - **Region:** *Central EU (Frankfurt)* – stejný jako Render, ať je databáze blízko.
   - **Database password:** vygeneruj silné heslo a **ulož si ho** (= `DB_PASSWORD`).
2. **Připojení k databázi přes pooler.** Render se k Supabase nedostane přímým
   připojením (to je jen přes IPv6), proto se používá *pooler*:
   - V projektu klikni nahoře na **Connect** → sekce **Session pooler**.
   - Ze zobrazených údajů si zapiš:

     | Údaj v Supabase | Proměnná | Příklad |
     |---|---|---|
     | host | `DB_HOST` | `aws-0-eu-central-1.pooler.supabase.com` (vezmi přesně to, co ukazuje Supabase) |
     | port | `DB_PORT` | `5432` (**session** mode; 6543 je transaction mode – ten nepoužívej) |
     | database | `DB_DATABASE` | `postgres` |
     | user | `DB_USERNAME` | `postgres.abcdefghijklmnop` (tvar `postgres.<project-ref>`) |

3. **Bucket pro materiály:** v levém menu **Storage** → **New bucket**
   - název `materials`,
   - **Public bucket: vypnuto** (soubory jsou soukromé, aplikace je posílá jen přihlášenému vlastníkovi).
4. **S3 klíče:** **Project Settings** → **Storage** → sekce **S3 Connection**:
   - **Endpoint** (např. `https://abcdefghijklmnop.supabase.co/storage/v1/s3`) = `AWS_ENDPOINT`,
   - **Region** (např. `eu-central-1`) = `AWS_DEFAULT_REGION`,
   - **New access key** → popis „eduvio“ → zobrazí se **Access key ID** (= `AWS_ACCESS_KEY_ID`)
     a **Secret access key** (= `AWS_SECRET_ACCESS_KEY`). **Secret se ukáže jen jednou – ulož ho.**

## b) APP_KEY – hlavní klíč aplikace

`APP_KEY` šifruje uložený Moodle token a STAG ticket. **Vygeneruj ho jednou a už ho
nikdy neměň** – s jiným klíčem by se uložené tokeny nedaly přečíst a všichni by se
museli znovu připojit. Ulož ho do správce hesel.

Lokálně v repu (stačí jeden z příkazů):

```bash
cd eduvio-backend
./vendor/bin/sail artisan key:generate --show     # přes Sail
php artisan key:generate --show                   # nebo s PHP v počítači
```

Výsledek vypadá jako `base64:H+0F…NgM=` – celé (i s `base64:`) je hodnota `APP_KEY`.

## c) Render: backend

1. Na [render.com](https://render.com) se zaregistruj (nejlépe přes GitHub) a dej
   **New** → **Blueprint** → vyber repozitář s Eduviem. Render najde `render.yaml`.
2. Render se zeptá na proměnné označené jako tajné (`sync: false`). Vyplň:

   | Proměnná | Odkud hodnotu vzít |
   |---|---|
   | `APP_KEY` | krok **b)** |
   | `APP_URL` | nech prázdné – použije se adresa služby na Renderu (`https://eduvio-api….onrender.com`) |
   | `FRONTEND_URL` | zatím `https://example.com`; po kroku **d)** ji přepíšeš na adresu z Vercelu |
   | `REGISTRATION_ALLOWED_DOMAINS` | prázdné (nebo např. `upol.cz`, pokud se smí registrovat jen školní e-maily) |
   | `DB_HOST`, `DB_USERNAME` | krok **a) 2** |
   | `DB_PASSWORD` | heslo databáze z kroku **a) 1** |
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT` | krok **a) 4** |
   | `DEPARTMENT_BOT_CONTACT` | tvůj e-mail nebo adresa aplikace (kontakt v hlavičce robota, který čte stránky vyučujících); může zůstat prázdné |

   Ostatní hodnoty (`STAG_MODE=agent`, `MATERIALS_DISK=s3`, `DB_SSLMODE=require`, region
   `eu-central-1`, bucket `materials` …) jsou předvyplněné v `render.yaml`. Když máš
   Supabase v jiném regionu nebo jinak pojmenovaný bucket, oprav `AWS_DEFAULT_REGION` /
   `AWS_BUCKET` později v **Environment**.
3. **Apply** spustí první build (5–10 minut). Průběh je v **Logs**.
4. Při startu kontejner:
   - zkontroluje povinné proměnné (chybějící vypíše jako `ERROR: missing required environment variables: …`),
   - spustí migrace databáze,
   - vypíše kontrolu konfigurace (`eduvio:check-config`): `✓ Database connection works.`,
     `✓ Materials disk (s3) is writable.` a případná varování `!`.
5. Otevři v prohlížeči `https://<tvoje-sluzba>.onrender.com/api/health`. Správně je:

   ```json
   {"db":"ok","storage":"ok","queue_pending":0}
   ```

   `fail` u `db` nebo `storage` → viz **i)**.

## d) Vercel: frontend

1. Na [vercel.com](https://vercel.com) se zaregistruj přes GitHub → **Add New…** → **Project**
   → importuj repozitář.
2. **Root Directory:** `eduvio-frontend` (Framework se nastaví na *Vite* sám, build
   a výstup bere z `vercel.json`).
3. **Environment Variables:**

   | Proměnná | Hodnota |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<tvoje-sluzba>.onrender.com/api` (**https** a **/api** na konci) |

4. **Deploy.** Po dokončení zkopíruj adresu webu (např. `https://eduvio.vercel.app`).
5. Zpět na **Render** → služba → **Environment** → `FRONTEND_URL` = adresa z Vercelu
   (bez lomítka na konci) → **Save, rebuild and deploy**. Bez toho prohlížeč volání API
   zablokuje (CORS).

> `VITE_API_BASE_URL` se do frontendu „zapéká“ při buildu. Když ji změníš, musíš ve
> Vercelu udělat **Redeploy**.

## e) cron-job.org: služba nesmí usnout

Free služba na Renderu po 15 minutách bez provozu usne a první požadavek pak trvá
i minutu. Zároveň by neběžel plánovač (noční Moodle sync). Proto ji budíme:

1. Na [cron-job.org](https://cron-job.org) se zaregistruj → **Create cronjob**.
2. **URL:** `https://<tvoje-sluzba>.onrender.com/up`
3. **Execution schedule:** každých **10 minut**.
4. Ulož. V historii by měly být odpovědi `200`.

`/up` je záměrně nenáročná (nesahá do databáze). Jedna stále běžící služba se vejde
do měsíčního limitu free hodin Renderu.

## f) První uživatel

Registrace je v produkci vypnutá (`REGISTRATION_ENABLED=false`).

1. Render → **Environment** → `REGISTRATION_ENABLED` = `true` → **Save, rebuild and deploy**.
2. Na webu z Vercelu se zaregistruj.
3. Render → `REGISTRATION_ENABLED` = `false` → **Save, rebuild and deploy**.

Přihlášení i registrace mají limit 5 pokusů za minutu.

## g) Moodle v produkci

Moodle vrací token do aplikace přes vlastní schéma adresy `web+eduvio://…`
(`MOODLE_LAUNCH_URLSCHEME`, v `render.yaml` už nastavené).

1. Na webu z Vercelu otevři **Profil → Osobní údaje → Moodle → Připojit**.
2. Prohlížeč se zeptá, jestli může Eduvio otevírat odkazy `web+eduvio` – **povol**.
3. Po přihlášení do Moodlu se vrátíš do aplikace a začne synchronizace.

Když se návrat nepovede (jiný prohlížeč, zablokovaný handler), použij v kartě Moodle
**ruční vložení** adresy podle návodu v aplikaci. `FRONTEND_URL` na Renderu musí být
přesně adresa z Vercelu, jinak návrat skončí na špatné adrese.

## h) STAG agent proti produkci

STAG je dostupný jen ze sítě UPOL, proto data stahuje agent na notebooku (VPN / eduroam).

1. Na webu **Profil → Osobní údaje → IS/STAG → Vytvořit token** – zkopíruj ho (zobrazí se jen jednou).
2. Na notebooku ve WSL, ve složce `stag_mock_import`:

   ```bash
   python3 stag_agent.py setup     # API URL: https://<tvoje-sluzba>.onrender.com/api, token z kroku 1
   python3 stag_agent.py login     # přihlášení do STAGu v prohlížeči
   python3 stag_agent.py           # první synchronizace
   ```

3. Běh na pozadí (sync na tlačítko „Synchronizovat teď“ i pravidelně) – v PowerShellu ve Windows:

   ```powershell
   cd \\wsl.localhost\Ubuntu\home\<uzivatel>\eduvio-project\stag_mock_import\windows
   powershell -ExecutionPolicy Bypass -File .\install-agent.ps1 -StartNow
   ```

   Do pár minut ukáže profil „Notebook online“. Podrobnosti: `stag_mock_import/AGENT.md`.

## i) Řešení častých chyb

| Příznak | Příčina a řešení |
|---|---|
| **CORS** – v konzoli prohlížeče „blocked by CORS policy“ | `FRONTEND_URL` na Renderu není přesně adresa webu: musí být `https://…`, bez lomítka na konci, přesně stejná doména jako ve Vercelu. Po změně **Save, rebuild and deploy**. |
| **502 / „Service unavailable“** hned po nasazení | Kontejner ještě startuje (migrace, cache) – počkej 1–2 minuty. V **Logs** hledej `ERROR: missing required environment variables` (doplň proměnné) nebo `database migrations failed 5 times` (viz další řádek). |
| **Databáze**: `could not translate host name`, `Network is unreachable`, `timeout` | Používáš přímé připojení `db.<ref>.supabase.co` (jen IPv6). Použij **Session pooler** (`aws-0-<region>.pooler.supabase.com`, port **5432**). |
| **Databáze**: `password authentication failed`, `Tenant or user not found` | U pooleru musí být `DB_USERNAME` ve tvaru `postgres.<project-ref>`; heslo je heslo databáze (ne heslo k účtu Supabase). Heslo lze resetovat v *Project Settings → Database*. |
| **Databáze**: `SSL off` / `no pg_hba.conf entry` | `DB_SSLMODE` musí být `require`. |
| **`/api/health` → `"storage":"fail"`, v logu S3 `403` / `AccessDenied` / `SignatureDoesNotMatch`** | Zkontroluj `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (ne anon/service key Supabase!), `AWS_ENDPOINT` končí `/storage/v1/s3`, `AWS_DEFAULT_REGION` = region projektu, `AWS_BUCKET` = existující bucket, `AWS_USE_PATH_STYLE_ENDPOINT=true`. |
| **Mixed content** / v konzoli `[Eduvio] VITE_API_BASE_URL must use https://` | `VITE_API_BASE_URL` ve Vercelu musí začínat `https://`. Oprav a dej **Redeploy**. |
| **Odkazy na soubory začínají `http://`** | Nastav `APP_URL=https://<tvoje-sluzba>.onrender.com` (nebo ho nech prázdné, doplní se samo). |
| **První načtení trvá dlouho**, aplikace „spí“ | Služba usnula – zkontroluj cron-job.org (**e)**), že pinguje `/up` každých 10 minut a dostává `200`. |
| **„Příliš mnoho pokusů“ při přihlášení** | Limit 5 pokusů za minutu – počkej minutu. |
| **Supabase projekt je „Paused“** | Free projekty Supabase se po delší nečinnosti pozastaví. Fronta úloh se databáze ptá každých 10 s, takže by k tomu nemělo dojít; kdyby ano, obnov projekt v dashboardu Supabase (**Restore**). |

**Kde hledat:** logy backendu jsou na Renderu v **Logs** (všechny procesy kontejneru:
web, fronta, plánovač). Kontrolu konfigurace lze spustit i ručně v **Shell** služby
(jen na placených plánech) příkazem `php artisan eduvio:check-config`; na free plánu
ji uvidíš v logu při každém startu.

---

### Lokální test produkčního image

Před nasazením lze image vyzkoušet lokálně proti Postgresu a S3 (RustFS místo Supabase):

```bash
cd eduvio-backend
docker compose -f compose.prod-test.yaml up --build -d
curl http://localhost:10000/api/health      # {"db":"ok","storage":"ok","queue_pending":0}
docker stats eduvio-prodtest-app            # paměť (limit 512 MB jako na Renderu)
docker compose -f compose.prod-test.yaml down -v
```
