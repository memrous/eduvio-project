# syntax=docker/dockerfile:1
#
# Eduvio API – production image (Render free web service, one container):
# nginx + php-fpm, queue worker and scheduler under supervisord.
#
# PHP 8.5: the same version as development (Sail) and the test suite. The locked
# dependencies (Symfony 8.1) need PHP >= 8.4.1, see composer.json.
#
#   docker build -t eduvio-api eduvio-backend
#   docker run --env-file prod.env -p 10000:10000 eduvio-api

# ── Base: PHP runtime with the extensions the app needs ───────────────
FROM php:8.5-fpm-alpine AS base

# Installer of PHP extensions (handles build deps and runtime libraries)
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

# pdo_pgsql: Supabase Postgres · intl, bcmath: framework helpers · zip: composer
# pcntl: queue:work timeouts and graceful stop · opcache: built in since PHP 8.5
RUN install-php-extensions pdo_pgsql intl zip bcmath pcntl \
    && (php -m | grep -qi 'zend opcache' || install-php-extensions opcache)

WORKDIR /var/www/html

# ── Build: production dependencies and optimized autoloader ───────────
FROM base AS build

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_NO_INTERACTION=1

# Dependencies first (cached layer while only app code changes)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-progress

COPY . .
RUN mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions \
             storage/framework/views storage/logs storage/app/private \
    && composer dump-autoload --no-dev --optimize --classmap-authoritative \
    && composer check-platform-reqs --no-dev \
    && rm -rf tests docker .env .env.* bootstrap/cache/*.php

# ── Runtime image ─────────────────────────────────────────────────────
FROM base AS runtime

RUN apk add --no-cache nginx supervisor \
    && addgroup -g 1000 app && adduser -D -u 1000 -G app -h /home/app app \
    && rm -f /usr/local/etc/php-fpm.d/*.conf

COPY docker/php.ini /usr/local/etc/php/conf.d/zz-eduvio.ini
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.conf
COPY docker/nginx.conf.template docker/supervisord.conf /etc/eduvio/
COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/eduvio-entrypoint

COPY --from=build --chown=app:app /var/www/html /var/www/html

# Production defaults; everything else comes from the Render environment
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PORT=10000

USER app
EXPOSE 10000

ENTRYPOINT ["eduvio-entrypoint"]
