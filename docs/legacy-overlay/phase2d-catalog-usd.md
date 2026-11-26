# افزونهٔ ۲د: کاتالوگ واقعی، آگهی‌های کامل با عکس و قیمت دلاری

> **سند تاریخی (HISTORICAL):** این افزونه مربوط به لایهٔ قدیمی overlay است.
> کاتالوگ اکنون در بکاند Django و فرانت pps/web پیاده شده است (۲۸ محصول، ۳۹ مسیر API)؛
> وضعیت فعلی را در [README.md](../../README.md) ببینید.

اجرا: `bash apply-all.sh ../shop` از ریشهٔ بسته (۲ب و ۲ج باید قبلاً اعمال شده باشند).

> وضعیت تاریخی راستیآزمایی: فقط منطق usd.ts با اسکریپت Node بررسی شد و تولید SQL اجرا شد. اکنون همان منطق در pps/pricing/money.py آزموده میشود و SQL توسط import_catalog جایگزین شده است.

## محتوا
- `data/real-catalog.json`: ۱۴ آگهی، همه با عکس، توضیح فارسی، مشخصات، منبع و تاریخ بررسی قیمت.
- `public/products/*.webp`: 24 عکس از عکس‌های ارسالی شما (تبدیل به WebP، بدون بزرگ‌نمایی و بدون ویرایش).
- `scripts/gen-seed.mjs`: از JSON همان فایل `legacy/supabase/seed-real-products.sql` (مسیر Supabase بسته شده؛ ADR-001) را می‌سازد.
- مایگریشن (چندبار اجرایش امن است): `price_usd_cents`، `final_usd_cents` (محاسباتی، تخفیف را به ۰ تا ۱۰۰ محدود می‌کند)، `brand`، `specs`، `price_checked_on`، `source_url`، `price_note` (`from` یا `approx`؛ برای نمایش «از» و «تقریبی» در کارت).
- `src/lib/usd.ts` و تست آن.

## آگهی‌ها
| آگهی | عکس | قیمت (دلار) |
|---|---|---|
| Galaxy S26 Ultra ۲۵۶ | ۴ | ۱٬۳۹۹٫۹۹ |
| Galaxy S26 Ultra ۵۱۲ | ۳ | ۱٬۵۹۹٫۹۹ |
| iPhone 18 Pro Max | ۴ | از ۱٬۲۹۹ |
| iPhone 18 Pro | ۱ | از ۱٬۱۹۹ |
| iPhone Air | ۱ | از ۱٬۰۹۹ |
| iPhone 17 Pro Max ۲۵۶ | ۳ | حدود ۹۱۹ |
| Xiaomi 18 Pro Max | ۱ | حدود ۱٬۰۴۳ |
| Lenovo Legion 7i (۲۰۲۶) | ۱ | ۳٬۱۳۹٫۹۹ |
| Lenovo Legion 5i Gen 11 | ۲ | از ۲٬۵۲۶ |
| Lenovo LOQ 15 (۲۰۲۶) | ۱ | از ۱٬۲۹۹ |
| ASUS ROG Strix SCAR 16 | ۱ | از ۳٬۲۹۹٫۹۹ |
| ASUS ROG Strix SCAR 18 | ۱ | حدود ۳٬۳۹۹ |
| ASUS ROG Strix G16 (۲۰۲۶) | ۴ | حدود ۳٬۶۹۹٫۹۹ |
| ASUS TUF Gaming 15 | ۲ | بدون قیمت (کد مدل لازم است؛ وارد دیتابیس نمی‌شود) |

آگهی‌هایی که عکس مطابق نداشتند حذف شدند: iPhone 17، Galaxy S26، Galaxy S26+ و دو ROG Zephyrus G16.

## نکات
1. **قیمت‌ها** تاریخ بررسی ۲۰۲۶-۱۰-۱۱ دارند و بین پیکربندی‌ها و فروشنده‌ها فرق می‌کنند. قبل از انتشار از منبع رسمی تأیید کنید. موجودی نمونه است.
2. **نرخ تومان:** ستون‌های تومانی سبد و سفارش هنوز لازم‌اند. سید تا `v_rate` را ننویسید خطا می‌دهد (`SET_V_RATE`). نرخ جعل نشده.
3. **انحصاری:** سید همهٔ محصولات قبلی را فقط غیرفعال می‌کند (حذف نمی‌کند).
4. **عکس‌ها:** عکس‌ها همان فایل‌هایی‌اند که شما فرستادید و تغییری در آن‌ها نداده‌ام. روی بعضی لوگوی فروشگاه یا سایت دیگری دیده می‌شود و بعضی کیفیت پایین یا نسل متفاوتی دارند. مجوز استفاده با شماست.
5. **نمایش دلار:** `PriceTag`، `ProductCard`، `LIST_SELECT` و JSON-LD هنوز عوض نشده‌اند چون فایل‌هایشان در بسته نبود. `price_usd_cents,final_usd_cents,brand,specs,price_note` را به `LIST_SELECT` اضافه کنید و `price_note` را به `note` در `ProductCard` بدهید، `formatToman` را با `formatUsd(final_usd_cents)` عوض کنید و `offers` را با `usdOffer` بسازید.
6. **پرداخت و `place_order`:** هنوز تومانی‌اند. برای پرداخت دلاری واقعی باید عوض شوند.
7. فرض‌های SQL: ستون‌های `slug` در products و categories، `categories.sort`، `products.description`، و `product_images(url,alt,sort)`.
