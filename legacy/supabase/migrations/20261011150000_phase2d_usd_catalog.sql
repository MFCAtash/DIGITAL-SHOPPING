-- فاز ۲د: قیمت دلاری و فراداده محصولات واقعی.
-- فرض: جدول products با ستون‌های discount_percent و slug از مراحل قبل وجود دارد. ستون‌های تومانی دست‌نخورده می‌مانند.
-- چندبار اجرا کردن این فایل امن است (idempotent).
begin;

alter table public.products
  add column if not exists price_usd_cents  integer,
  add column if not exists brand            text,
  add column if not exists specs            jsonb not null default '{}'::jsonb,
  add column if not exists price_checked_on date,
  add column if not exists source_url       text,
  add column if not exists price_note       text;

alter table public.products drop constraint if exists products_price_usd_chk;
alter table public.products drop constraint if exists products_source_url_chk;
alter table public.products drop constraint if exists products_price_note_chk;
alter table public.products
  add constraint products_price_usd_chk  check (price_usd_cents is null or price_usd_cents > 0),
  add constraint products_source_url_chk check (source_url is null or source_url ~ '^https://'),
  add constraint products_price_note_chk check (price_note is null or price_note in ('from', 'approx'));

-- قیمت نهایی دلاری (سنت) با همان منطق تخفیف (هم‌منطق با finalUsdCents در src/lib/usd.ts):
-- تخفیف به بازهٔ ۰ تا ۱۰۰ محدود و به عدد صحیح (trunc) تبدیل می‌شود، null به‌معنی ۰٪ است، ضرب در bigint انجام می‌شود تا سرریز نکند.
-- مقدار null یعنی هنوز قیمت دلاری ندارد.
alter table public.products
  add column if not exists final_usd_cents integer
  generated always as (
    case when price_usd_cents is null then null
         else (
           price_usd_cents::bigint
           * (100 - trunc(greatest(0, least(100, coalesce(discount_percent, 0)))::numeric)::bigint)
           / 100
         )::integer
    end
  ) stored;

create index if not exists products_brand_idx on public.products (brand) where is_active;
create index if not exists products_usd_idx   on public.products (final_usd_cents) where is_active;

commit;
