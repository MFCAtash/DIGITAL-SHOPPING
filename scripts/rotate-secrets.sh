#!/usr/bin/env bash
# کمک چرخش رازها: مقادیر تصادفی جدید چاپ میکند (هرگز روی دیسک ذخیره نمیشود).
# پس از چرخش: .env سرور را بهروز کنید، سرویسها را restart و نشستهای فعال را باطل کنید.
set -euo pipefail
rand() { python3 -c 'import secrets; print(secrets.token_urlsafe(64))'; }
hex64() { python3 -c 'import secrets; print(secrets.token_hex(32))'; }

cat <<EOF
# مقادیر جدید را به .env production (یا Secret Manager) منتقل کنید؛ در گیت ذخیره نکنید.
SECRET_KEY=$(rand)
OTP_SECRET=$(hex64)
METRICS_TOKEN=$(hex64)
PAYMENT_CALLBACK_SECRET=$(hex64)
SMS_HTTP_TOKEN=$(rand)
PAYMENT_API_KEY=$(rand)
POSTGRES_PASSWORD=$(rand)
REDIS_PASSWORD=$(rand)
GRAFANA_ADMIN_PASSWORD=$(rand)
EOF

cat >&2 <<'EOF'

چکلیست پس از چرخش:
  1) مقادیر را در Secret Manager/ENV سرور بهروز کنید (نه در فایل tracked).
  2) docker compose up -d --force-recreate api worker
  3) python manage.py check --deploy --fail-level WARNING
  4) تمام نشستها را باطل کنید: python manage.py clearsessions && flushdb (Redis)
  5) کلیدهای قدیمی را در سامانهٔ ارائهدهنده (درگاه/SMS) باطل و لاگ چرخش را ثبت کنید.
EOF
