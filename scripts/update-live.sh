#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3120}"
DOMAIN="${DOMAIN:-crm.artevapp.com.tr}"
echo "CRM / ERP crmv1.45 INSTALL CONTRACT HOTFIX"
echo "Port: $PORT | Domain: $DOMAIN"
cd "$ROOT"
BASE="${BASE:-/home/arteva/arteva-crm-erp-efsana36}" PORT="$PORT" SERVICE_NAME="${SERVICE_NAME:-crm-erp-efsana36}" bash scripts/emergency-recover.sh || true
VERSION="3.8.57" bash scripts/write-changelog.sh || true
PORT="$PORT" DOMAIN="$DOMAIN" bash install.sh
PORT="$PORT" EXPECTED_VERSION=3.8.57 EXPECTED_RELEASE=v3.8.57-crmv1.45-web-import-upsert-ui-document-fix EXPECTED_BUILD=crmv1.45 bash scripts/health-check.sh
printf '\nGüncelleme tamamlandı. Nginx mevcut %s portuna yönlenmeye devam eder.\n' "$PORT"
