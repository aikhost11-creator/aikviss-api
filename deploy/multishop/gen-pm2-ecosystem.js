#!/usr/bin/env node
/**
 * Generate PM2 ecosystem for all tenants.
 * Run on VPS: node deploy/multishop/gen-pm2-ecosystem.js > ecosystem.multishop.config.js
 *
 * Tenant list: $TENANTS_JSON, else $MULTISHOP_ROOT/tenants.json (per-VPS, not in git),
 * else deploy/multishop/tenants.json from the repo.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.MULTISHOP_ROOT || '/var/www/multishop';
const API_SRC = path.join(ROOT, 'sources', 'api');
const override = process.env.TENANTS_JSON || path.join(ROOT, 'tenants.json');
const tenantsPath = fs.existsSync(override)
  ? override
  : path.join(API_SRC, 'deploy', 'multishop', 'tenants.json');
const tenants = JSON.parse(fs.readFileSync(tenantsPath, 'utf8'));

const apps = tenants
  .filter((t) => {
    const envFile = path.join(ROOT, 'tenants', t.domain, '.env');
    if (!fs.existsSync(envFile)) {
      console.error(`SKIP ${t.domain}: missing ${envFile}`);
      return false;
    }
    return true;
  })
  .map((t) => {
    const tenantDir = path.join(ROOT, 'tenants', t.domain);
    const envFile = path.join(tenantDir, '.env');
    const logsDir = path.join(tenantDir, 'api-logs');
    return {
      name: `api-${t.id}`,
      script: 'index.js',
      cwd: API_SRC,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ENV_FILE: envFile,
      },
      max_memory_restart: '512M',
      time: true,
      error_file: path.join(logsDir, 'err.log'),
      out_file: path.join(logsDir, 'out.log'),
      merge_logs: true,
    };
  });

if (!apps.length) {
  console.error('No tenant has a .env — nothing to start');
  process.exit(1);
}

console.log('module.exports = { apps: ' + JSON.stringify(apps, null, 2) + ' };');
