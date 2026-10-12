#!/bin/sh
# Start of the Eduvio API container: check the configuration, migrate, cache,
# then run web + queue worker + scheduler under supervisord.
set -eu

cd /var/www/html

# Render provides the public https address of the service: use it unless APP_URL is set
if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    export APP_URL="$RENDER_EXTERNAL_URL"
fi

# ── 1. Required variables (clear error instead of a crash later) ──────
missing=""
require() {
    for name in "$@"; do
        eval "value=\${$name:-}"
        [ -n "$value" ] || missing="$missing $name"
    done
}

require APP_KEY FRONTEND_URL MATERIALS_DISK
if [ -z "${DB_URL:-}" ]; then
    require DB_HOST DB_DATABASE DB_USERNAME DB_PASSWORD
fi
if [ "${MATERIALS_DISK:-}" = "s3" ]; then
    require AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION AWS_BUCKET AWS_ENDPOINT
fi

if [ -n "$missing" ]; then
    echo "ERROR: missing required environment variables:$missing" >&2
    echo "Set them in the Render dashboard (Environment). See DEPLOY.md, step 'Render'." >&2
    exit 1
fi

# ── 2. Runtime directories (the disk is ephemeral) and nginx on $PORT ──
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views \
         storage/logs storage/app/private bootstrap/cache
sed "s/__PORT__/${PORT:-10000}/" /etc/eduvio/nginx.conf.template > /tmp/nginx.conf

# ── 3. Database migrations (a few attempts: the DB may not be reachable yet) ──
attempt=1
until php artisan migrate --force --no-interaction; do
    if [ "$attempt" -ge 5 ]; then
        echo "ERROR: database migrations failed 5 times. Check DB_* (Supabase pooler, DB_SSLMODE=require)." >&2
        exit 1
    fi
    echo "Migrations failed (attempt $attempt/5), retrying in 5 s..." >&2
    attempt=$((attempt + 1))
    sleep 5
done

# ── 4. Caches (config is read from the environment only here) ─────────
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction
php artisan event:cache --no-interaction

# ── 5. Production configuration check: only a warning, start continues ─
php artisan eduvio:check-config --no-interaction \
    || echo "WARNING: eduvio:check-config reported problems (see above); the app starts anyway." >&2

# ── 6. Web + queue + scheduler ───────────────────────────────────────
exec supervisord -c /etc/eduvio/supervisord.conf
