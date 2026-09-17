#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/crmv20-tests.XXXXXX")"

cleanup() {
  case "$TEST_ROOT" in
    "${TMPDIR:-/tmp}"/crmv20-tests.*) rm -rf -- "$TEST_ROOT" ;;
    *) echo "Güvenli olmayan test dizini temizlenmedi: $TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

export DATABASE_FILE="$TEST_ROOT/test.sqlite"
export SHARED_DIR="$TEST_ROOT/shared"
export PRIVATE_UPLOAD_DIR="$TEST_ROOT/private"
export BACKUP_DIR="$TEST_ROOT/backups"
export SESSION_SECRET="test-session-secret-12345678901234567890"
export DATA_ENCRYPTION_KEY="test-data-secret-1234567890123456789012"

cd "$ROOT"
node src/db/migrate.js

node scripts/test-auth-csrf.js
node scripts/test-money.js
node scripts/test-permission-defaults.js
node scripts/test-email-list.js
python3 scripts/test-migrations.py
node scripts/ejs-compile-test.js
node scripts/test-login-render.js
node scripts/test-login-save-contract.js
node scripts/test-login-public-tenant-contract.js
node scripts/test-session-store.js
node scripts/test-v360-contracts.js
node scripts/test-v359-excel-parser.js
node scripts/test-v360-pdf-parser.js
node scripts/test-v365-contracts.js
node scripts/test-v370-contracts.js
node scripts/test-v370-preview-render.js
node scripts/test-v372-contracts.js
node scripts/test-v373-contracts.js
node scripts/test-v375-contracts.js
node scripts/test-v376-contracts.js
node scripts/test-v372-strict-import.js
node scripts/test-crmv20-contracts.js
node scripts/test-v3814-consistency.js
node scripts/test-v3814-ui-contracts.js
node scripts/test-v3815-ui-integrity.js
node scripts/test-v3816-security-recovery.js
node scripts/test-v3817-integrity.js
node scripts/test-v3818-responsive-workflows.js
node scripts/test-v3819-template-search-print.js

node scripts/test-product-media-v3821.js
node scripts/test-v3822-mobile-lists.js
node scripts/test-v3823-mobile-single-line.js
node scripts/test-crmv10-hotfix.js

node scripts/test-crmv13-ui.js
node scripts/test-crmv14-contracts.js
node scripts/test-crmv15-contracts.js
node scripts/test-crmv1-7-contracts.js
node scripts/test-crmv1-8-contracts.js
node scripts/test-crmv1-9-contracts.js
node scripts/test-crmv1-10-contracts.js
node scripts/test-crmv1-11-contracts.js
node scripts/test-crmv1-12-contracts.js
node scripts/test-crmv1-13-contracts.js
node scripts/test-audit-remediation.js
node scripts/test-crmv1-14-performance.js
node scripts/test-crmv1-15-print-layout.js
node scripts/test-crmv1-16-preview-template-studio.js
node scripts/test-crmv1-17-mobile-print-resize.js
node scripts/test-crmv1-18-render.js
node scripts/test-crmv1-19-template-restore.js
node scripts/test-crmv1-20-live-behavior.js
node scripts/test-crmv1-22-proforma-studio.js

node scripts/test-crmv1-25-colors-pricing.js
node scripts/test-crmv1-26-palette-address.js

node scripts/test-crmv1-27-product-preview-image.js
node scripts/test-crmv1-28-email-tracking-mobile-assets.js
node scripts/test-crmv1-29-mobile-brochure-download.js

node scripts/test-crmv1-30-print-assets-email-redirect.js
node scripts/test-crmv1-31-install-contract-hotfix.js
node scripts/test-crmv1-32-product-upload-preview-performance.js
node scripts/test-crmv1-33-product-inline-catalog-visit-order.js

node scripts/test-crmv1-34-persistent-media-catalog-print.js
node scripts/test-crmv1-35-web-product-import.js
node scripts/test-crmv1-36-web-catalog-scan-revision.js

node scripts/test-crmv1-37-web-scan-live-history.js

node scripts/test-crmv1-38-web-history-csp.js
node scripts/test-crmv1-39-release-contract.js
node scripts/test-crmv1-40-current-base-hotfix.js

node scripts/test-crmv1-41-web-import-reliability.js
node scripts/test-crmv1-42-web-import-control-center.js
node scripts/test-crmv1-43-product-web-import-repair.js
node scripts/test-crmv1-44-web-import-ui-sanitizer.js
node scripts/test-crmv1-45-web-import-upsert-ui-docs.js

# crmv1.46 — kırılma noktası ölçeği tek yerde tutulur
node scripts/test-breakpoint-scale.js
