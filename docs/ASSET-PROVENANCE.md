# منبع و مجوز داراییها (Product Image Provenance)

این سند خلاصهای از منبع تصاویر و فونتهای موجود در تحویل است. منبع حقیقت جزئیات،
فایل `overlay/data/image-rights.json` است (یک ورودی به ازای هر عکس).

## کاتالوگ محصولات
- کاتالوگ مرجع: `overlay/data/real-catalog.json` — **۲۸ محصول**، تاریخ بررسی قیمت ۲۰۲۶-۱۰-۱۱.
- تصاویر در `apps/web/public/media/products/` (همان محتوای `overlay/public/products/`) قرار دارند.
- دفتر حقوق عکسها `overlay/data/image-rights.json` شامل **۵۱ ورودی** است:
  - **۴۹ عکس** با `license: "source-attribution"` و `rights_status: "needs-review"`: عکسهایی که در صفحات منبع
    مشخصشده در فیلد `source` همان ورودی دیده میشوند. صرفاً با ذکر منبع، اجازهٔ بازتوزیع تجاری ثبت نشده است؛
    پیش از انتشار تجاری باید مجوز کتبی یا جایگزینی با عکس آزاد اخذ شود.
  - **۲ عکس** با `rights_status: "user-provided"`: تصاویر ارسالشدهٔ کاربر برای **Grand Theft Auto VI**
    (`images (1).jpg` بهعنوان جلد و `images.jpg` بهعنوان تصویر ترکیبی؛ نگهداریشده در
    `overlay/data/source-images/gta-vi/`). مشتقات `gta-vi-cover-hd.webp` و `gta-vi-collage-hd.webp`
    با فیلتر Lanczos3 و unsharp-mask ملایم تهیه شدهاند (جلد ۱۸۶۰×۲۶۳۶، ترکیبی ۱۶۰۸×۲۰۰۸، WebP کیفیت ۹۵).
- فایلهای `grand-theft-auto-vi-{1,2}.svg` و `gta-vi-*-art.webp` گرافیک ساختگی/جایگزین پروژهاند،
  نه عکس رسمی منتشرشده توسط ناشر بازی.
- فیلد `source` در `real-catalog.json` به منبع **قیمت/مشخصات** میپردازد، نه مجوز عکس؛ مجوز در فایل
  دفتر حقوق ثبت شده است.
- برند **Starlink** بهطور پیشفرض توسط `HIDDEN_BRANDS` پنهان میماند تا بازبینی حقوقی انجام شود.
- تنظیم `REQUIRE_IMAGE_LICENSE=True` در prod در حالی است که اکثر عکسها `needs-review`اند؛
  بنابراین پیش از import نهایی یا باید مجوزها تکمیل شوند یا سیاست مجوز عکس بهطور آگاهانه بازبینی شود.

## فونتها
فونتها از Google Fonts بهصورت self-hosted (`apps/web/public/fonts/*.woff2`) دانلود شدهاند
(`scripts_fetch_fonts.py`). مجوز SIL OFL 1.1 و copyright مربوطه در
`apps/web/public/fonts/LICENSES.txt` ثبت است: Vazirmatn، IBM Plex Sans و IBM Plex Mono.

## سایر داراییها
- لوگو، نمادها و تمها (Nexus Loop، Diamond Halo و ۶ تم کهکشانی + کاغذ گرم/شب مخملی) ساختهٔ پروژهاند
  و در `docs/LOGO-CONCEPTS-2026-FA.md` و `docs/GALAXY-THEMES-FA.md` مستند شدهاند.
- کد پروژه تحت مجوز MIT است (`LICENSE` و `NOTICE`)؛ مجوز کتابخانههای شخص ثالث تابع توزیعهای upstream آنهاست.

## وضعیت بازبینی
| دارایی | تعداد | وضعیت |
|---|---|---|
| عکسهای دارای منبع با مجوز نیازمند بازبینی | ۴۹ | ❌ مجوز تجاری تأیید نشده |
| عکسهای ارسالی کاربر | ۲ | ✅ منبع کاربر، بدون حق چاپ ناشر |
| فونتهای OFL | ۸ فایل | ✅ مجوز ثبتشده |
| لوگو/تم ساختهٔ پروژه | — | ✅ ساختهٔ پروژه |

**اقدام لازم پیش از انتشار تجاری:** تکمیل `rights_status` در `overlay/data/image-rights.json`
برای ۴۹ عکس یا جایگزینی آنها، و تأیید نهایی توسط متخصص حقوقی.
