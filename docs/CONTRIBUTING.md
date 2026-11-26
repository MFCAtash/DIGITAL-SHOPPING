# مشارکت در پروژه

## ساختار
- `backend/` — Django + Ninja (دامنه، API، migrationها)
- `packages/ui/` — Design System (توکنها، کامپوننتها، تستها)
- `apps/web/` — اپلیکیشن Next.js فروشگاه
- `contracts/openapi.json` — قرارداد API (مرجع؛ تغییرات API حتماً آن را بهروز کنید)
- `docs/adr/` — تصمیمات معماری

## قبل از ارسال PR
```bash
# بکاند (با Postgres)
cd backend && ruff check . && python -m unittest discover -s tests/pure -t . && \
  python manage.py makemigrations --check --dry-run && pytest -q

# Design System
cd packages/ui && npm run check && npm run preview

# وب
cd apps/web && npx tsc --noEmit && npm run build && npm run test:e2e
```

## قواعد
- هر تغییر API باید هم قرارداد و هم تست انطباق را بهروز کند.
- migrationها حتماً کامیت شوند؛ drift در CI خطا است.
- رنگها فقط از توکنها بیایند (`npm run contrast` و `npm run lint:design`).
- رشتههای کاربررو در لایهٔ i18n قرار گیرند (فعلاً fa و en؛ de به تعویق افتاده است).
- پیامهای خطای API همیشه `{code, message}`اند و کد خطا ماشینخوان است.

## نامگذاری
- operationIdها snake_case و یکتا باشند.
- مدلها و سرویسها به فارسی مستند، به انگلیسی نامگذاری شوند.
