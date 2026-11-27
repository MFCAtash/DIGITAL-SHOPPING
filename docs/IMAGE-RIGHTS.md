# Catalogue image rights / حقوق تصاویر کاتالوگ

> **Status:** 51 registered images — **49 `needs-review`** and **2 `user-provided`**. No catalogue image is cleared for commercial redistribution.

> **وضعیت:** ۵۱ تصویر ثبتشده — **۴۹ مورد `needs-review`** و **۲ مورد `user-provided`**. هیچ تصویر کاتالوگی برای بازتوزیع تجاری تأیید نشده است.

## Why this matters / چرا مهم است

Product photographs were collected from public product pages with a source-attribution record. Publication on a public page is not the same as permission to redistribute or use commercially. The honest register is [`overlay/data/image-rights.json`](../overlay/data/image-rights.json); every image has `file`, `product_slug`, `source`, `license`, `rights_status` and a note.

عکسها از صفحات عمومی محصول با ثبت منبع گردآوری شدهاند. انتشار عمومی بهمعنای اجازۀ بازتوزیع یا استفادۀ تجاری نیست. دفتر صادقانه در فایل فوق نگهداری میشود.

## Decisions and controls / تصمیمها و کنترلها

| Control | Implementation |
|---|---|
| Publication guard | `REQUIRE_IMAGE_LICENSE=True` in production blocks products without cleared images |
| Admin validation | `check_rate_change()` and image-rights reporting |
| Reporting | `python manage.py report_image_rights --strict` |
| Pre-release gate | `report_data_quality --strict` + `report_image_rights --strict` |
| Hidden brands | `HIDDEN_BRANDS=Starlink` blocks a brand pending review |
| User-provided assets | The two GTA VI covers are explicitly marked `user-provided` |

## Resolution plan / برنامهٔ تعیین تکلیف

1. **Replace** each `needs-review` image with licensed or self-created artwork; update the register and re-run `import_catalog`.
2. **Or** obtain written permission from the rights holder and change `rights_status` to `cleared` with the permission reference in `note`.
3. **Or** keep the image for non-commercial demonstration only and leave `REQUIRE_IMAGE_LICENSE=True` in every deployed environment.
4. Never remove an entry from the register — history and provenance must remain auditable.

## Reproducing the report / تولید مجدد گزارش

```bash
cd backend
python manage.py report_image_rights
python manage.py report_image_rights --strict   # non-zero exit if anything is unresolved
```

Related reading: [`ASSET-PROVENANCE.md`](ASSET-PROVENANCE.md), [`PROJECT-AUDIT-2026-FA.md`](PROJECT-AUDIT-2026-FA.md) and the source register linked above.
