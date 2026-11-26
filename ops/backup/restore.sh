#!/usr/bin/env bash
# بازیابی ایمن بکاپ فشرده (و در صورت نیاز رمزگشایی GPG) به دیتابیس جداگانه.
# استفاده: POSTGRES_USER=codex RESTORE_DB=codex_restore_test ./restore.sh /var/backups/codex/codex-....sql.gz[.gpg]
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "usage: $0 /path/to/codex-*.sql.gz" >&2
  exit 2
fi
: "${POSTGRES_USER:?}"
TARGET_DB="${RESTORE_DB:-codex_restore_test}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/codex}"

SQL_FILE="$FILE"
TMP_DECRYPT=""
if [[ "$FILE" == *.gpg ]]; then
  command -v gpg >/dev/null || { echo "gpg لازم است." >&2; exit 1; }
  TMP_DECRYPT="$(mktemp)"
  trap 'rm -f "$TMP_DECRYPT"' EXIT
  gpg --batch --yes --decrypt --output "$TMP_DECRYPT" "$FILE"
  SQL_FILE="$TMP_DECRYPT"
fi

gzip -t "$SQL_FILE" || { echo "فایل بکاپ خراب است: $FILE" >&2; exit 3; }

psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${TARGET_DB};" -c "CREATE DATABASE ${TARGET_DB};"
gunzip -c "$SQL_FILE" | psql -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1

# تست سلامت حداقلی: جدولهای حیاتی باید وجود داشته باشند.
psql -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 -tAc \
  "select count(*) from information_schema.tables where table_schema='public' and table_name in ('orders_order','catalog_product','accounts_user')" \
  | grep -q '^3$' || { echo "بازیابی ناقص است؛ جداول حیاتی یافت نشدند." >&2; exit 4; }

echo "restore ok: $FILE -> $TARGET_DB"
