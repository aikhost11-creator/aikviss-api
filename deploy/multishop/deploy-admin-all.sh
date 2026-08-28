#!/usr/bin/env bash
# Build ADMIN once per tenant (different API_URL each), rsync to tenant admin-live.
set -euo pipefail

ROOT="${MULTISHOP_ROOT:-/var/www/multishop}"
ADMIN_SRC="$ROOT/sources/admin"
API_SRC="$ROOT/sources/api"
TENANTS_JSON="$API_SRC/deploy/multishop/tenants.json"

cd "$ADMIN_SRC"
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)
git checkout "$BRANCH" 2>/dev/null || git checkout -B main
git reset --hard "origin/$BRANCH" 2>/dev/null || git reset --hard origin/main

npm i --force

node -e "
const fs=require('fs');
const {execSync}=require('child_process');
const tenants=JSON.parse(fs.readFileSync('$TENANTS_JSON'));
const adminSrc='$ADMIN_SRC';
const root='$ROOT';
for (const t of tenants) {
  const apiUrl='https://api.'+t.domain+'/api/';
  const cfgPath=adminSrc+'/src/assets/configuration.json';
  fs.writeFileSync(cfgPath, JSON.stringify({APIUrl: apiUrl}, null, 2)+'\n');
  console.log('Building ADMIN for', t.domain, '→', apiUrl);
  execSync('npm run build -- --configuration=production', {stdio:'inherit', cwd:adminSrc});
  const live=root+'/tenants/'+t.domain+'/admin-live';
  const dist=fs.existsSync(adminSrc+'/dist/teamcamp/browser') ? adminSrc+'/dist/teamcamp/browser' : adminSrc+'/dist/teamcamp';
  fs.mkdirSync(live,{recursive:true});
  execSync('rsync -a --delete \"'+dist+'/\" \"'+live+'/\"', {stdio:'inherit', shell:'/bin/bash'});
}
console.log('ADMIN deployed for all tenants');
"
