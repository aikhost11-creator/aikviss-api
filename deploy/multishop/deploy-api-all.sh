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

npm i --force

node "$DEPLOY/gen-pm2-ecosystem.js" > "$API_SRC/ecosystem.multishop.config.js"

# Ensure log dirs + .env exist per tenant
node -e "
const fs=require('fs');
const tenants=JSON.parse(fs.readFileSync('$DEPLOY/tenants.json'));
for (const t of tenants) {
  const d='$ROOT/tenants/'+t.domain;
  fs.mkdirSync(d+'/api-logs',{recursive:true});
  if (!fs.existsSync(d+'/.env')) {
    console.error('MISSING '+d+'/.env — run vps-bootstrap-multishop.sh first');
    process.exit(1);
  }
}
"

pm2 delete ecosystem.multishop.config.js 2>/dev/null || true
pm2 start "$API_SRC/ecosystem.multishop.config.js"
pm2 save
echo "API deployed for all tenants"
