#!/bin/sh
set -e
# در staging مهاجرت خودکار است؛ در prod بهتر است جدا و پس از پشتیبان اجرا شود (RUN_MIGRATIONS=0)
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  python manage.py migrate --noinput
fi
# static files are collected at runtime so the build never needs production secrets
if [ "${RUN_COLLECTSTATIC:-1}" = "1" ]; then
  python manage.py collectstatic --noinput
fi
exec "$@"
