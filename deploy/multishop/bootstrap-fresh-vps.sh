#!/usr/bin/env bash
# ============================================================
# Fresh VPS one-shot: write this VPS's tenants.json from a template, then run setup-vps.sh
# with default data seeding (admin login, siteconfig, COD, FAQ, legal pages).
#
# Templates in this folder:
#   tenants.vps3.example.json      -> VPS3 200.141.5.132  (default)
#   tenants.bluehost.example.json  -> Bluehost 129.121.171.40
#
# Usage (as root on empty VPS):
#   apt-get update -y && apt-get install -y git
#   git clone https://github.com/aikhost11-creator/aikviss-api.git /var/www/multishop/sources/api
#   cd /var/www/multishop/sources/api
#   sed -i 's/\r$//' deploy/multishop/*.sh && chmod +x deploy/multishop/*.sh
#   TENANTS_TEMPLATE=tenants.bluehost.example.json SSL_EMAIL=you@mail.com \
#     nohup bash deploy/multishop/bootstrap-fresh-vps.sh > /root/setup.log 2>&1 &
# ============================================================
set -euo pipefail

ROOT="${MULTISHOP_ROOT:-/var/www/multishop}"
API_SRC="$ROOT/sources/api"
DEPLOY="$API_SRC/deploy/multishop"
TEMPLATE_NAME="${TENANTS_TEMPLATE:-tenants.vps3.example.json}"
case "$TEMPLATE_NAME" in
  /*) EXAMPLE="$TEMPLATE_NAME" ;;
  *)  EXAMPLE="$DEPLOY/$TEMPLATE_NAME" ;;
esac

if [ ! -f "$EXAMPLE" ]; then
  echo "ERROR: $EXAMPLE missing — pull latest aikviss-api first"
  exit 1
fi

mkdir -p "$ROOT"
# Write THIS VPS tenant list (never overwrite if already customized — use FORCE_TENANTS=1)
if [ ! -f "$ROOT/tenants.json" ] || [ "${FORCE_TENANTS:-0}" = "1" ]; then
  cp "$EXAMPLE" "$ROOT/tenants.json"
  echo "Wrote $ROOT/tenants.json from $(basename "$EXAMPLE") ($(jq length "$ROOT/tenants.json") tenants)"
else
  echo "Keeping existing $ROOT/tenants.json"
fi

cat "$ROOT/tenants.json"
echo ""

export TENANTS_JSON="$ROOT/tenants.json"
export MULTISHOP_ROOT="$ROOT"
export SEED_DEFAULTS="${SEED_DEFAULTS:-1}"

SSL_EMAIL="${SSL_EMAIL:-}" bash "$DEPLOY/setup-vps.sh"

echo ""
echo "============================================================"
echo " BOOTSTRAP DONE"
echo " Credentials: cat $ROOT/tenant-credentials.txt"
echo " Admin login (all shops): admin@gmail.com / admin  — CHANGE AFTER LOGIN"
echo " phpMyAdmin: https://pma.<domain>  (DB user/pass from credentials file)"
echo "============================================================"
