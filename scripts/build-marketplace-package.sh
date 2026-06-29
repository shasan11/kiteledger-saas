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
(cd "$DIST" && zip -qr "$(basename "$ZIP")" kiteledger)
echo "Marketplace package created: $ZIP"
