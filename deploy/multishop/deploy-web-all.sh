#!/usr/bin/env bash
# Build WEB (UI) once per tenant (different API_URL each), rsync to tenant web-live.
set -euo pipefail

ROOT="${MULTISHOP_ROOT:-/var/www/multishop}"
WEB_SRC="$ROOT/sources/web"
API_SRC="$ROOT/sources/api"
TENANTS_JSON="$API_SRC/deploy/multishop/tenants.json"

cd "$WEB_SRC"
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)
git checkout "$BRANCH" 2>/dev/null || git checkout -B main
git reset --hard "origin/$BRANCH" 2>/dev/null || git reset --hard origin/main

npm i --force

node -e "
const fs=require('fs');
const {execSync}=require('child_process');
const tenants=JSON.parse(fs.readFileSync('$TENANTS_JSON'));
const webSrc='$WEB_SRC';
const root='$ROOT';
for (const t of tenants) {
  const apiUrl='https://api.'+t.domain+'/api/';
  const cfgPath=webSrc+'/src/assets/configuration.json';
  fs.writeFileSync(cfgPath, JSON.stringify({APIUrl: apiUrl}, null, 2)+'\n');
  console.log('Building WEB for', t.domain, '→', apiUrl);
  execSync('npm run build -- --configuration=production', {stdio:'inherit', cwd:webSrc});
  const live=root+'/tenants/'+t.domain+'/web-live';
  const dist=fs.existsSync(webSrc+'/dist/teamcamp/browser') ? webSrc+'/dist/teamcamp/browser' : webSrc+'/dist/teamcamp';
  fs.mkdirSync(live,{recursive:true});
  execSync('rsync -a --delete \"'+dist+'/\" \"'+live+'/\"', {stdio:'inherit', shell:'/bin/bash'});
}
console.log('WEB deployed for all tenants');
"
