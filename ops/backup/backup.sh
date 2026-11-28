#!/usr/bin/env bash
# بکاپ Postgres (فشرده، اختیاراً رمزگذاری شده و قابل کپی به مقصد offsite).
# پیشفرض: هر ۱۵ دقیقه به ازای RPO ≤ ۱۵ دقیقه؛ KEEP=96 یعنی ۲۴ ساعت نگهداری.
set -euo pipefail

: "${POSTGRES_DB:?}"
: "${POSTGRES_USER:?}"
: "${BACKUP_DIR:-/var/backups/digital-shopping}"
KEEP="${KEEP:-96}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/digital-shopping-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges | gzip > "$OUT"
gzip -t "$OUT" || { echo "فایل بکاپ خراب است: $OUT" >&2; exit 3; }
echo "backup ok: $OUT"

# رمزگذاری اختیاری با کلید عمومی GPG (هیچ رازی در اسکریپت یا CI ذخیره نمیشود).
if [[ -n "${BACKUP_GPG_RECIPIENT:-}" ]]; then
  command -v gpg >/dev/null || { echo "gpg لازم است." >&2; exit 1; }
  gpg --batch --yes --trust-model always --encrypt --recipient "$BACKUP_GPG_RECIPIENT" \
    --output "$OUT.gpg" "$OUT"
  rm -f "$OUT"
  OUT="$OUT.gpg"
  echo "encrypted: $OUT"
fi

# کپی اختیاری به مقصد offsite با rclone (مثلاً S3-compatible؛ اعتبارها از محیط میآیند).
if [[ -n "${OFFSITE_TARGET:-}" ]]; then
  command -v rclone >/dev/null || { echo "rclone لازم است." >&2; exit 1; }
  rclone copy "$OUT" "$OFFSITE_TARGET" --no-traverse
  echo "offsite ok: $OUT -> $OFFSITE_TARGET"
fi

# پاکسازی نسخههای قدیمی (هم .gz و هم .gpg).
find "$BACKUP_DIR" -name 'digital-shopping-*.sql.gz*' -type f | sort -r | tail -n +$((KEEP + 1)) | xargs -r rm -f

# تست بازیابی (ماهانه یا با RESTORE_TEST=1): بازیابی در دیتابیس جداگانه و بررسی جداول حیاتی.
if [[ "${RESTORE_TEST:-0}" == "1" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  RESTORE_DB="${RESTORE_DB:-digital_shopping_restore_test}" "$SCRIPT_DIR/restore.sh" "$OUT"
fi
