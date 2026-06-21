#!/usr/bin/env bash
#
# KiteLedger fast install (GitHub clone / VPS / FastPanel).
#
# Builds the application so it is ready to serve, then hands DB setup,
# admin creation and the install lock over to the web installer (/install)
# or to `php artisan kiteledger:install`. This script never touches the DB
# (no migrate, no seed).
#
# It is intentionally resilient: a benign non-zero exit (e.g. storage:link
# when the link already exists) does NOT abort the run. Only the steps that
# truly must succeed (composer install, npm build) stop the script.

# Run from the project root regardless of where the script is invoked.
cd "$(dirname "$0")/.." || exit 1

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { printf "${GREEN}OK${NC}   %s\n" "$1"; }
info() { printf "${YELLOW}==>${NC}  %s\n" "$1"; }
die()  { printf "${RED}FAIL${NC} %s\n" "$1" >&2; exit 1; }

echo "Starting KiteLedger fast install..."
echo

# --- Tooling checks -----------------------------------------------------------
for bin in php composer node npm; do
    command -v "$bin" >/dev/null 2>&1 || die "'$bin' is not installed or not on PATH. Install it and re-run."
done

echo "Detected tool versions:"
php -v | head -n 1
composer --version
echo "node $(node -v)"
echo "npm  $(npm -v)"
echo

# --- Backend dependencies -----------------------------------------------------
info "Installing PHP dependencies (composer install --no-dev)..."
composer install --no-dev --optimize-autoloader || die "composer install failed. Fix the error above and re-run."
[ -f vendor/autoload.php ] || die "vendor/autoload.php is still missing after composer install."
ok "Composer dependencies installed."

# --- Environment file ---------------------------------------------------------
if [ ! -f .env ]; then
    cp .env.example .env || die "Could not copy .env.example to .env."
    ok ".env created from .env.example."
else
    ok ".env already exists (left untouched)."
fi

# --- Application key -----------------------------------------------------------
# Treat APP_KEY as set only when it has a real value (not empty, not a comment).
if grep -qE '^APP_KEY=base64:.+' .env; then
    ok "APP_KEY already set."
else
    info "Generating APP_KEY..."
    php artisan key:generate --force || die "key:generate failed."
    ok "APP_KEY generated."
fi

# --- Frontend build -----------------------------------------------------------
info "Installing frontend dependencies (npm install)..."
npm install || die "npm install failed. Check your Node version (need 20.19+/22.12+) and the error above."

info "Building frontend assets (npm run build)..."
npm run build || die "npm run build failed. See the Vite error above."
[ -f public/build/manifest.json ] || die "public/build/manifest.json missing after build — the asset build did not complete."
ok "Frontend assets built."

# --- Storage link + permissions (best-effort) ---------------------------------
info "Linking public storage..."
php artisan storage:link >/dev/null 2>&1 && ok "Storage linked." || info "storage:link skipped (already linked or unsupported host)."

info "Setting writable permissions on storage and bootstrap/cache..."
chmod -R 775 storage bootstrap/cache 2>/dev/null && ok "Permissions set." || info "Could not chmod (may need sudo / your host sets these)."

# --- Clean cache state --------------------------------------------------------
# optimize:clear removes any stale config/route/view cache so the values the
# installer writes to .env take effect immediately. Do NOT cache here.
info "Clearing compiled caches..."
php artisan optimize:clear >/dev/null 2>&1 && ok "Caches cleared." || info "Cache clear skipped."

# NOTE: migrations and seeders are intentionally NOT run here. Finish setup via
# the web installer (/install) or `php artisan kiteledger:install`.

echo
echo "============================================================"
printf "${GREEN}Fast install completed.${NC}\n"
echo "Next, complete the database setup one of two ways:"
echo "  1. Browser : open https://your-domain.com/install"
echo "  2. Terminal: php artisan kiteledger:install   (recommended on a VPS)"
echo
echo "Make sure your web server document root points to /public."
echo "Verify anytime with: php artisan kiteledger:doctor"
echo "============================================================"
