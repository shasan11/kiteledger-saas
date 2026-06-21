#!/usr/bin/env bash
#
# KiteLedger fast install (GitHub clone / VPS / FastPanel).
#
# Builds the application so it is ready to serve, then hands DB setup,
# admin creation and the install lock over to the web installer (/install).
# This script deliberately does NOT run migrations or seeders.
#
set -e

echo "Starting KiteLedger fast install..."

# --- Tooling checks -----------------------------------------------------------
require() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "ERROR: '$1' is not installed or not on PATH. Install it and re-run." >&2
        exit 1
    fi
}

require php
require composer
require node
require npm

echo
echo "Detected tool versions:"
php -v | head -n 1
composer --version
echo "node $(node -v)"
echo "npm  $(npm -v)"
echo

# --- Backend dependencies -----------------------------------------------------
echo "==> Installing PHP dependencies (composer install --no-dev)..."
composer install --no-dev --optimize-autoloader

# --- Environment file ---------------------------------------------------------
if [ ! -f .env ]; then
    echo "==> Creating .env from .env.example..."
    cp .env.example .env
else
    echo "==> .env already exists, leaving it untouched."
fi

# --- Application key -----------------------------------------------------------
if grep -qE '^APP_KEY=.+' .env && ! grep -qE '^APP_KEY=\s*$' .env; then
    echo "==> APP_KEY already set, skipping key:generate."
else
    echo "==> Generating APP_KEY..."
    php artisan key:generate
fi

# --- Frontend build -----------------------------------------------------------
echo "==> Installing frontend dependencies (npm install)..."
npm install

echo "==> Building frontend assets (npm run build)..."
npm run build

# --- Storage link -------------------------------------------------------------
echo "==> Linking public storage..."
php artisan storage:link || true

# --- Permissions --------------------------------------------------------------
echo "==> Setting writable permissions on storage and bootstrap/cache..."
chmod -R 775 storage bootstrap/cache || true

# --- Clear caches -------------------------------------------------------------
echo "==> Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# NOTE: migrations and seeders are intentionally NOT run here.
# The web installer (/install) handles DB migration, seeding, company,
# branch, admin user and the install lock once DB credentials are entered.

echo
echo "============================================================"
echo "Fast install completed."
echo "Now open https://your-domain.com/install to complete database setup."
echo "Make sure your web server document root points to /public."
echo "============================================================"
