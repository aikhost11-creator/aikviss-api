#!/usr/bin/env bash
# Deploy API source once, reload all tenant PM2 processes.
set -euo pipefail

ROOT="${MULTISHOP_ROOT:-/var/www/multishop}"
API_SRC="$ROOT/sources/api"
DEPLOY="$API_SRC/deploy/multishop"

cd "$API_SRC"
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)
git checkout "$BRANCH" 2>/dev/null || git checkout -B main
git reset --hard "origin/$BRANCH" 2>/dev/null || git reset --hard origin/main

# Per-VPS tenant list ($ROOT/tenants.json) wins over the repo list
TENANTS_JSON="${TENANTS_JSON:-$ROOT/tenants.json}"
[ -f "$TENANTS_JSON" ] || TENANTS_JSON="$DEPLOY/tenants.json"
export TENANTS_JSON MULTISHOP_ROOT="$ROOT"
echo "Tenants: $TENANTS_JSON"

npm i --force

node -e "
const fs=require('fs');
const tenants=JSON.parse(fs.readFileSync('$TENANTS_JSON'));
for (const t of tenants) {
  fs.mkdirSync('$ROOT/tenants/'+t.domain+'/api-logs',{recursive:true});
}
"

node "$DEPLOY/gen-pm2-ecosystem.js" > "$API_SRC/ecosystem.multishop.config.js.tmp"

# Delete using the previous ecosystem so tenants removed from the list also stop
if [ -f "$API_SRC/ecosystem.multishop.config.js" ]; then
  pm2 delete "$API_SRC/ecosystem.multishop.config.js" 2>/dev/null || true
fi
mv "$API_SRC/ecosystem.multishop.config.js.tmp" "$API_SRC/ecosystem.multishop.config.js"

pm2 start "$API_SRC/ecosystem.multishop.config.js"
pm2 save
echo "API deployed for all tenants"
