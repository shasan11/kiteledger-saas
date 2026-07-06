#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$DIST/kiteledger"
ZIP="$DIST/kiteledger-marketplace.zip"

for tool in composer npm rsync zip; do
  command -v "$tool" >/dev/null || { echo "$tool is required" >&2; exit 1; }
done

cd "$ROOT"
npm ci
npm run build
mkdir -p "$DIST"
rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"

rsync -a ./ "$STAGE/" \
  --exclude='.env' --exclude='.git/' --exclude='.github/' \
  --exclude='.idea/' --exclude='.vscode/' --exclude='.codex/' \
  --exclude='node_modules/' --exclude='vendor/' --exclude='tests/' \
  --exclude='dist/' --exclude='database/*.sqlite*' \
  --exclude='storage/logs/*' --exclude='storage/framework/cache/*' \
  --exclude='storage/framework/sessions/*' --exclude='storage/framework/views/*' \
  --exclude='storage/app/installed' --exclude='public/storage' \
  --exclude='public/hot' --exclude='bootstrap/cache/*.php'

composer install --working-dir="$STAGE" --no-dev --prefer-dist \
  --optimize-autoloader --no-interaction --no-progress
php "$STAGE/artisan" optimize:clear --no-interaction

required_paths=(
  "vendor/autoload.php"
  "public/build/manifest.json"
  ".env.example"
  "artisan"
  "bootstrap/app.php"
  "storage"
  "bootstrap/cache"
  "resources/views/vendor/installer"
  "public/installer"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$STAGE/$path" ]]; then
    echo "Marketplace package validation failed: missing $path" >&2
    exit 1
  fi
done

if [[ ! -f "$STAGE/database/sql/mysql_install.sql" ]]; then
  echo "SQL install dump missing. Browser installer will use migration fallback. This can be slower and less reliable on shared hosting." >&2
  if [[ "${STRICT_MARKETPLACE_BUILD:-0}" == "1" ]]; then
    echo "Strict marketplace build requires database/sql/mysql_install.sql." >&2
    exit 1
  fi
fi

(cd "$DIST" && zip -qr "$(basename "$ZIP")" kiteledger)
echo "Marketplace package created: $ZIP"
