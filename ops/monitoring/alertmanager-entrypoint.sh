#!/bin/sh
# پیکربندی Alertmanager را از قالب و متغیرهای محیطی میسازد (بدون نیاز به envsubst).
set -eu
SRC=/etc/alertmanager/alertmanager.template.yml
DST=/etc/alertmanager/alertmanager.yml

: "${ALERT_WEBHOOK_URL:=http://127.0.0.1:9/discard}"
: "${SLACK_WEBHOOK_URL:=http://127.0.0.1:9/discard}"
: "${EMAIL_TO:=alerts@localhost}"
: "${SMTP_SMARTHOST:=localhost:25}"
: "${SMTP_FROM:=alertmanager@localhost}"
: "${SMTP_REQUIRE_TLS:=false}"

cp "$SRC" "$DST"
sed -i "s|\${ALERT_WEBHOOK_URL}|${ALERT_WEBHOOK_URL}|g" "$DST"
sed -i "s|\${SLACK_WEBHOOK_URL}|${SLACK_WEBHOOK_URL}|g" "$DST"
sed -i "s|\${EMAIL_TO}|${EMAIL_TO}|g" "$DST"
sed -i "s|\${SMTP_SMARTHOST}|${SMTP_SMARTHOST}|g" "$DST"
sed -i "s|\${SMTP_FROM}|${SMTP_FROM}|g" "$DST"
sed -i "s|\${SMTP_REQUIRE_TLS}|${SMTP_REQUIRE_TLS}|g" "$DST"
exec /bin/alertmanager "$@"
