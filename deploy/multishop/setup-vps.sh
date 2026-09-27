#!/usr/bin/env bash
# ============================================================
# One-shot / re-runnable VPS setup for the tenants in $ROOT/tenants.json
#   bash /var/www/multishop/sources/api/deploy/multishop/setup-vps.sh
#
# Env options:
#   SSL_EMAIL=you@mail.com  -> also issue Let's Encrypt certs (DNS must point here)
#   SKIP_BUILD=1            -> only API (skip ADMIN/WEB Angular builds)
#   FORCE_NGINX=1           -> rewrite nginx vhosts even if they exist (drops certbot SSL blocks)
#
# Safe to re-run: existing .env / DB passwords are kept, existing vhosts are kept.
# ============================================================
set -euo pipefail

ROOT="${MULTISHOP_ROOT:-/var/www/multishop}"
API_SRC="$ROOT/sources/api"
ADMIN_SRC="$ROOT/sources/admin"
WEB_SRC="$ROOT/sources/web"
DEPLOY="$API_SRC/deploy/multishop"
TENANTS_JSON="${TENANTS_JSON:-$ROOT/tenants.json}"

REPO_API="https://github.com/aikhost11-creator/aikviss-api.git"
REPO_ADMIN="https://github.com/aikhost11-creator/aikviss-admin.git"
REPO_WEB="https://github.com/aikhost11-creator/aikviss-web.git"

if [ ! -f "$TENANTS_JSON" ]; then
  echo "ERROR: $TENANTS_JSON not found. Create it first (list of {id, domain, port, dbName})."
  exit 1
fi
export TENANTS_JSON MULTISHOP_ROOT="$ROOT"

echo "==> 1) Packages"
export DEBIAN_FRONTEND=noninteractive
timedatectl set-timezone Asia/Kolkata 2>/dev/null || true
apt-get update -y
apt-get install -y curl git nginx rsync ufw certbot python3-certbot-nginx jq openssl \
  mysql-server php-fpm php-mysql php-mbstring php-xml php-curl php-zip php-gd unzip

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null 2>&1 || npm i -g pm2

systemctl enable --now mysql nginx

PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
PHP_SOCK="/var/run/php/php${PHP_VER}-fpm.sock"
systemctl enable --now "php${PHP_VER}-fpm"

echo "==> 2) Swap (Angular builds need RAM)"
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 3) Sources"
mkdir -p "$ROOT/sources" "$ROOT/tenants"
clone_if_missing() {
  local dir="$1" url="$2"
  [ -d "$dir/.git" ] || { rm -rf "$dir"; git clone "$url" "$dir"; }
}
clone_if_missing "$API_SRC" "$REPO_API"
clone_if_missing "$ADMIN_SRC" "$REPO_ADMIN"
clone_if_missing "$WEB_SRC" "$REPO_WEB"
chmod +x "$DEPLOY/"*.sh 2>/dev/null || true

echo "==> 4) Per-tenant DB + .env"
CREDS_FILE="$ROOT/tenant-credentials.txt"
touch "$CREDS_FILE"
chmod 600 "$CREDS_FILE"

env_get() { grep -E "^$2=" "$1" | head -n1 | cut -d= -f2- | tr -d '\r' || true; }

while IFS= read -r row; do
  ID=$(echo "$row" | jq -r '.id')
  DOMAIN=$(echo "$row" | jq -r '.domain')
  PORT=$(echo "$row" | jq -r '.port')
  DB_NAME=$(echo "$row" | jq -r '.dbName')
  TENANT_DIR="$ROOT/tenants/$DOMAIN"
  ENV_FILE="$TENANT_DIR/.env"
  mkdir -p "$TENANT_DIR/admin-live" "$TENANT_DIR/web-live" "$TENANT_DIR/api-logs"

  if [ -f "$ENV_FILE" ] && [ -n "$(env_get "$ENV_FILE" DB_USER)" ] && [ -n "$(env_get "$ENV_FILE" DB_PASSWORD)" ]; then
    DB_USER=$(env_get "$ENV_FILE" DB_USER)
    DB_PASS=$(env_get "$ENV_FILE" DB_PASSWORD)
    ENV_DB=$(env_get "$ENV_FILE" DB_NAME)
    [ -n "$ENV_DB" ] && DB_NAME="$ENV_DB"
    sed -i 's/\r$//' "$ENV_FILE"
    if grep -q '^PORT=' "$ENV_FILE"; then
      sed -i "s/^PORT=.*/PORT=${PORT}/" "$ENV_FILE"
    else
      echo "PORT=${PORT}" >> "$ENV_FILE"
    fi
    echo "   $DOMAIN: keeping existing .env"
  else
    DB_USER="${ID}_user"
    DB_PASS=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 20)
    cat > "$ENV_FILE" <<EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
DB_CONNECTION_LIMIT=10

PORT=${PORT}
JWT_KEY=$(openssl rand -hex 16)
TZ=Asia/Kolkata
SHOP_DOMAIN=${DOMAIN}
SHIPEASO_API_URL=https://superadmin.shipeaso.com/api/order/non-shopify-create-orders
EOF
    chmod 600 "$ENV_FILE"
    echo "   $DOMAIN: created .env"
  fi

  # Make MySQL match the .env (fixes ER_ACCESS_DENIED on re-runs)
  mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" </dev/null
  mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" </dev/null
  mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" </dev/null
  mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;" </dev/null

  sed -i "/^--- ${DOMAIN} ---$/,/^$/d" "$CREDS_FILE"
  {
    echo "--- ${DOMAIN} ---"
    echo "DB: ${DB_NAME} | user: ${DB_USER} | pass: ${DB_PASS} | API port: ${PORT}"
    echo "WEB: https://${DOMAIN}  ADMIN: https://admin.${DOMAIN}"
    echo "API: https://api.${DOMAIN}  PMA: https://pma.${DOMAIN}"
    echo ""
  } >> "$CREDS_FILE"
done < <(jq -c '.[]' "$TENANTS_JSON")

echo "==> 5) phpMyAdmin"
if [ ! -f /usr/share/phpmyadmin/index.php ]; then
  cd /tmp
  curl -fsSL -o pma.tar.gz https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.tar.gz
  mkdir -p /usr/share/phpmyadmin
  tar -xzf pma.tar.gz -C /usr/share/phpmyadmin --strip-components=1
  rm -f pma.tar.gz
fi
mkdir -p /usr/share/phpmyadmin/tmp
if [ ! -f /usr/share/phpmyadmin/config.inc.php ]; then
  cat > /usr/share/phpmyadmin/config.inc.php <<EOF
<?php
\$cfg['blowfish_secret'] = '$(openssl rand -hex 16)';
\$i = 1;
\$cfg['Servers'][\$i]['auth_type'] = 'cookie';
\$cfg['Servers'][\$i]['host'] = '127.0.0.1';
\$cfg['Servers'][\$i]['compress'] = false;
\$cfg['Servers'][\$i]['AllowNoPassword'] = false;
\$cfg['TempDir'] = '/usr/share/phpmyadmin/tmp';
EOF
fi
chown -R www-data:www-data /usr/share/phpmyadmin

PHP_INI="/etc/php/${PHP_VER}/fpm/php.ini"
if [ -f "$PHP_INI" ]; then
  sed -i 's/^upload_max_filesize.*/upload_max_filesize = 256M/; s/^post_max_size.*/post_max_size = 256M/; s/^memory_limit.*/memory_limit = 512M/; s/^max_execution_time.*/max_execution_time = 600/' "$PHP_INI"
  systemctl restart "php${PHP_VER}-fpm"
fi

echo "==> 6) Nginx vhosts"
while IFS= read -r row; do
  DOMAIN=$(echo "$row" | jq -r '.domain')
  PORT=$(echo "$row" | jq -r '.port')
  TENANT_DIR="$ROOT/tenants/$DOMAIN"
  CONF="/etc/nginx/sites-available/multishop-${DOMAIN}.conf"

  if [ -f "$CONF" ] && [ "${FORCE_NGINX:-0}" != "1" ]; then
    # Keep certbot's SSL blocks, only fix the API port if it changed
    sed -i -E "s#proxy_pass http://127\.0\.0\.1:[0-9]+;#proxy_pass http://127.0.0.1:${PORT};#" "$CONF"
    echo "   $DOMAIN: vhost exists (port synced)"
  else
    cat > "$CONF" <<EOF
# ${DOMAIN}
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${TENANT_DIR}/web-live;
    index index.html;
    client_max_body_size 50M;
    location / { try_files \$uri \$uri/ /index.html; }
}
server {
    listen 80;
    server_name admin.${DOMAIN};
    root ${TENANT_DIR}/admin-live;
    index index.html;
    client_max_body_size 50M;
    location / { try_files \$uri \$uri/ /index.html; }
}
server {
    listen 80;
    server_name api.${DOMAIN};
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
server {
    listen 80;
    server_name pma.${DOMAIN};
    root /usr/share/phpmyadmin;
    index index.php;
    client_max_body_size 256M;
    location / { try_files \$uri \$uri/ =404; }
    location ~ \\.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${PHP_SOCK};
        fastcgi_read_timeout 600;
    }
}
EOF
    echo "   $DOMAIN: vhost written"
  fi
  ln -sf "$CONF" "/etc/nginx/sites-enabled/multishop-${DOMAIN}.conf"
done < <(jq -c '.[]' "$TENANTS_JSON")

# Drop vhosts of tenants that are not on this VPS anymore
for f in /etc/nginx/sites-enabled/multishop-*.conf; do
  [ -e "$f" ] || continue
  d=$(basename "$f" .conf); d=${d#multishop-}
  jq -e --arg d "$d" 'any(.[]; .domain == $d)' "$TENANTS_JSON" >/dev/null || { rm -f "$f"; echo "   removed vhost $d"; }
done

rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> 7) Firewall"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

echo "==> 8) Deploy API"
bash "$DEPLOY/deploy-api-all.sh"
pm2 startup systemd -u root --hp /root >/dev/null || true
pm2 save

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> 9) Build ADMIN + WEB"
  bash "$DEPLOY/deploy-admin-all.sh"
  bash "$DEPLOY/deploy-web-all.sh"
fi

echo "==> 10) SSL"
VPS_IP=$(curl -fsS4 --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
while IFS= read -r row; do
  DOMAIN=$(echo "$row" | jq -r '.domain')
  NAMES="$DOMAIN www.$DOMAIN admin.$DOMAIN api.$DOMAIN pma.$DOMAIN"
  NOT_READY=""
  for n in $NAMES; do
    ip=$(getent ahostsv4 "$n" 2>/dev/null | awk 'NR==1{print $1}' || true)
    [ "$ip" = "$VPS_IP" ] || NOT_READY="$NOT_READY $n(${ip:-none})"
  done
  if [ -n "$NOT_READY" ]; then
    echo "   $DOMAIN: DNS not pointing to $VPS_IP yet ->$NOT_READY"
  elif [ -n "${SSL_EMAIL:-}" ]; then
    certbot --nginx --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect --expand \
      -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" -d "api.$DOMAIN" -d "pma.$DOMAIN" </dev/null \
      || echo "   $DOMAIN: certbot failed (see above)"
  else
    echo "   $DOMAIN: DNS OK — re-run with SSL_EMAIL=you@mail.com to issue SSL"
  fi
done < <(jq -c '.[]' "$TENANTS_JSON")

echo ""
echo "==> Health check"
while IFS= read -r row; do
  DOMAIN=$(echo "$row" | jq -r '.domain')
  PORT=$(echo "$row" | jq -r '.port')
  sleep 1
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${PORT}/" || true)
  echo "   api.${DOMAIN} (port ${PORT}): HTTP ${code}  (404 = API alive, 000 = down)"
done < <(jq -c '.[]' "$TENANTS_JSON")

pm2 ls
echo ""
echo "============================================================"
echo " SETUP DONE. Credentials: cat $CREDS_FILE"
echo "============================================================"
