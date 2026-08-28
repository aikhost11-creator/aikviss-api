# Multi-shop API deploy

Push to `main` → updates **all 5 shops** on VPS.

Scripts: `deploy/multishop/deploy-api-all.sh`  
Tenants: `deploy/multishop/tenants.json`

VPS layout: `/var/www/multishop/sources/api` + `/var/www/multishop/tenants/<domain>/.env`

Full guide: see `MULTISHOP-DEPLOY.md` in monorepo or Hostinger docs.
