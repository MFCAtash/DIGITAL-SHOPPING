# legacy/ (فقط مرجع تاریخی)

مسیر **Supabase** طبق [ADR-001](../docs/adr/0001-django-nextjs.md) بسته شده است. فایل‌های `legacy/supabase/` (مهاجرت‌ها و seed) دیگر ساخته یا استفاده نمی‌شوند و در CI و استقرار نقشی ندارند.

- هیچ تغییر جدیدی در این پوشه انجام نشود.
- منبع حقیقت کاتالوگ: `overlay/data/real-catalog.json` (برای Django با `manage.py import_catalog`).
- `overlay/scripts/gen-seed.mjs` هنوز می‌تواند `seed-real-products.sql` را اینجا بسازد؛ فقط برای مرجع.
- پس از پایان مرحلهٔ ۳ (پورت Next.js) این پوشه حذف می‌شود.
