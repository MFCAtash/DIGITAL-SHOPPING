#!/usr/bin/env bash
# پیکربندی Alertmanager را از متغیرهای محیطی میسازد؛ پیشفرضها هیچ هدف خارجیای ندارند.
# استفاده: bash ops/monitoring/render-alertmanager.sh > /etc/alertmanager/alertmanager.yml
set -euo pipefail

# آدرس 127.0.0.1:9 (discard) هیچ بستهای خارجی را باز نمیکند؛ تا وقتی راز واقعی تنظیم نشده، اعلانی بیرون نمیرود.
export ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-http://127.0.0.1:9/discard}"
export SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-http://127.0.0.1:9/discard}"
export EMAIL_TO="${EMAIL_TO:-alerts@localhost}"
export SMTP_SMARTHOST="${SMTP_SMARTHOST:-localhost:25}"
export SMTP_FROM="${SMTP_FROM:-alertmanager@localhost}"
export SMTP_REQUIRE_TLS="${SMTP_REQUIRE_TLS:-false}"

command -v envsubst >/dev/null || { echo "envsubst لازم است (gettext-base را نصب کنید)." >&2; exit 1; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
envsubst '${ALERT_WEBHOOK_URL} ${SLACK_WEBHOOK_URL} ${EMAIL_TO} ${SMTP_SMARTHOST} ${SMTP_FROM} ${SMTP_REQUIRE_TLS}' \
  < "$SCRIPT_DIR/alertmanager.yml"
