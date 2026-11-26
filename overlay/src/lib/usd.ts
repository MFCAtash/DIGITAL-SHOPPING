/** قیمت دلاری با سنت (عدد صحیح) ذخیره می‌شود تا خطای اعشار نداشته باشیم. */
export function formatUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "-";
  const c = Math.round(cents);
  // قیمت رُند بدون اعشار ($1,299)، در غیر این صورت همیشه دو رقم اعشار ($239.50، نه $239.5)
  const digits = c % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits })
    .format(c / 100);
}

/**
 * قیمت نهایی پس از تخفیف درصدی؛ هم‌منطق با ستون محاسباتی final_usd_cents (تقسیم صحیح به پایین).
 * ورودی نامعتبر (NaN، بی‌نهایت، منفی) هرگز NaN یا قیمت منفی نمی‌دهد: قیمت نامعتبر ۰ و تخفیف نامعتبر ۰٪ حساب می‌شود.
 */
export function finalUsdCents(priceCents: number, discountPercent: number): number {
  const price = Number.isFinite(priceCents) ? Math.max(0, Math.trunc(priceCents)) : 0;
  const d = Number.isFinite(discountPercent) ? Math.min(100, Math.max(0, Math.trunc(discountPercent))) : 0;
  return Math.floor((price * (100 - d)) / 100);
}

/** داده ساختاریافته: قیمت اینجا دلار است، نه ریال. */
export function usdOffer(cents: number, inStock: boolean) {
  return {
    "@type": "Offer",
    priceCurrency: "USD",
    price: (cents / 100).toFixed(2),
    availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
  };
}
