#!/usr/bin/env bash
# اعمال افزونهٔ نهایی (۲د + ۲ه + ۲و) روی پروژهٔ Next.js. اجرا: bash apply-all.sh ../path-to-project
set -euo pipefail
T="${1:?مسیر پروژه را بدهید. مثال: bash apply-all.sh ../shop}"
H="$(cd "$(dirname "$0")" && pwd)"
[ -f "$T/package.json" ] || { echo "package.json در $T پیدا نشد"; exit 1; }
T="$(cd "$T" && pwd)"
[ "$T" != "$H" ] || { echo "مسیر پروژه نباید خود پوشهٔ این بسته باشد"; exit 1; }
B="$(dirname "$T")/digital-shopping-backup-$(date +%Y%m%d%H%M%S)"; n=0

# پشتیبان از فایل‌هایی که قرار است بازنویسی شوند
while IFS= read -r f; do
  if [ -f "$T/$f" ]; then mkdir -p "$B/$(dirname "$f")"; cp "$T/$f" "$B/$f"; n=$((n+1)); fi
done < <(cd "$H/overlay" && find . -type f | sed 's|^\./||')
echo "پشتیبان $n فایل موجود: $B"

cp -R "$H/overlay/." "$T/"
cd "$T"; s=0

# --no-install: اگر typescript در پروژه نیست، بستهٔ نامرتبط «tsc» از اینترنت نصب نشود
if [ -f tsconfig.json ]; then npx --no-install tsc --noEmit || s=1; else echo "هشدار: tsconfig.json نیست؛ tsc اجرا نشد"; fi
npm run lint --if-present || s=1

if [ $s -eq 0 ]; then echo "اعمال شد. فایل docs/legacy-overlay/phase2e-theme-brand.md را برای اتصال بخوانید."
else echo "خطا؛ خروجی بالا را بفرستید. پشتیبان: $B"; exit 1; fi
