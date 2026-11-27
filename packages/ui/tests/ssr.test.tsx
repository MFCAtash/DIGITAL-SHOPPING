import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup as render } from "react-dom/server";
import {
  Accordion, AddressForm, AdaptiveAccent, Alert, Badge, BrandMark, Breadcrumb, Button, ButtonLink, Checkbox, Combobox, CompareTable, Countdown, EmptyState, ErrorState, FilterPanel,
  Gallery, Icon, ICON_NAMES, IconButton, Modal, OrderTimeline, OtpInput, Pagination, PriceHistoryChart, PriceTag, ProductCard, ProductCardSkeleton, QuantityStepper, RadioGroup, SearchBox,
  SelectField, Skeleton, SpecTable, Stepper, StockIndicator, Switch, Tabs, TextField, Tooltip,
} from "../src";

const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;

/** بررسی‌های ایستای دسترس‌پذیری روی هر خروجی: alt برای تصویر، نام برای دکمه */
function basicA11y(html: string): void {
  for (const m of html.matchAll(/<img\b[^>]*>/g)) assert.match(m[0], /\balt=/, `تصویر بدون alt: ${m[0]}`);
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const named = /aria-label="[^"]+"/.test(m[1]!) || m[2]!.replace(/<[^>]*>/g, "").trim().length > 0;
    assert.ok(named, `دکمه بدون نام: ${m[0].slice(0, 120)}`);
  }
  for (const m of html.matchAll(/<input\b([^>]*)>/g)) {
    if (/type="(hidden|checkbox|radio)"/.test(m[1]!)) continue;
    assert.ok(/aria-label="[^"]+"|id="/.test(m[1]!), `ورودی بدون برچسب: ${m[0].slice(0, 100)}`);
  }
}

test("آیکون‌ها: همه رندر می‌شوند، تزئینی‌اند و با title نام می‌گیرند", () => {
  assert.ok(ICON_NAMES.length >= 24);
  for (const n of ICON_NAMES) {
    const h = render(<Icon name={n} />);
    assert.match(h, /aria-hidden="true"/);
    assert.match(h, /stroke-width="1.5"/);
  }
  assert.match(render(<Icon name="check" title="تأیید" />), /role="img"[\s\S]*<title>تأیید<\/title>/);
  assert.match(render(<Icon name="chevron-end" mirror />), /cx-icon--dir/);
});

test("دکمه‌ها", () => {
  const b = render(<Button variant="primary" loading>ثبت</Button>);
  assert.match(b, /type="button"/);
  assert.match(b, /disabled/);
  assert.match(b, /aria-busy="true"/);
  assert.match(b, /cx-btn--primary/);
  assert.match(render(<Button type="submit">ارسال</Button>), /type="submit"/);
  assert.match(render(<ButtonLink href="/cart" variant="primary">سبد</ButtonLink>), /<a [^>]*href="\/cart"/);
  const ib = render(<IconButton icon="cart" label="سبد خرید" badge={3} />);
  assert.match(ib, /aria-label="سبد خرید"/);
  assert.match(ib, /aria-hidden="true">3</);
  assert.match(render(<IconButton icon="heart" label="علاقه‌مندی" pressed />), /aria-pressed="true"/);
  basicA11y(b + ib);
});

test("TextField: برچسب، راهنما، خطا", () => {
  const h = render(<TextField label="موبایل" id="m" hint="با ۰۹ شروع کنید" error="نامعتبر" required contentDir="ltr" />);
  assert.match(h, /<label for="m"/);
  assert.match(h, /id="m"/);
  assert.match(h, /aria-invalid="true"/);
  assert.match(h, /aria-describedby="m-hint m-err"/);
  assert.match(h, /dir="ltr"/);
  assert.match(h, /required/);
  assert.match(h, /aria-live="polite"/);
  assert.match(h, /نامعتبر/);
  const ok = render(<TextField label="نام" id="n" />);
  assert.doesNotMatch(ok, /aria-invalid/);
  assert.doesNotMatch(ok, /aria-describedby/);
  basicA11y(h + ok);
});

test("Select، Checkbox، RadioGroup، Switch", () => {
  const sel = render(<SelectField label="مرتب‌سازی" id="s" hideLabel options={[{ value: "a", label: "الف" }, { value: "b", label: "ب", disabled: true }]} placeholder="انتخاب" />);
  assert.match(sel, /cx-sr-only/);
  assert.match(sel, /<option value="">انتخاب/);
  assert.match(sel, /<option value="b" disabled/);
  const cb = render(<Checkbox label="سامسونگ" count="۱۲" checked readOnly />);
  assert.match(cb, /type="checkbox"/);
  assert.match(cb, /checked/);
  const rg = render(<RadioGroup legend="رنگ" name="c" value="b" onChange={() => {}} options={[{ value: "a", label: "الف" }, { value: "b", label: "ب" }]} />);
  assert.match(rg, /<fieldset/);
  assert.match(rg, /<legend/);
  assert.equal(count(rg, /type="radio"/g), 2);
  assert.equal(count(rg, /checked=""/g), 1);
  assert.match(rg, /checked=""[^>]*value="b"/); // فقط گزینهٔ «ب» انتخاب است
  const sw = render(<Switch checked label="حالت تاریک" onCheckedChange={() => {}} />);
  assert.match(sw, /role="switch"/);
  assert.match(sw, /aria-checked="true"/);
  basicA11y(sel + cb + rg + sw);
});

test("Combobox: الگوی ARIA 1.2", () => {
  const h = render(<Combobox label="استان" options={[{ value: "t", label: "تهران" }, { value: "f", label: "فارس" }]} value="" onValueChange={() => {}} required />);
  assert.match(h, /role="combobox"/);
  assert.match(h, /aria-autocomplete="list"/);
  assert.match(h, /aria-expanded="false"/);
  assert.match(h, /aria-controls="[^"]+-list"/);
  assert.match(h, /<ul id="[^"]+-list" role="listbox"[^>]* hidden/);
  assert.equal(count(h, /role="option"/g), 2);
  const sb = render(<SearchBox suggestions={[]} query="" onQueryChange={() => {}} onSearch={() => {}} />);
  assert.match(sb, /role="search"/);
  assert.match(sb, /cx-sr-only/); // برچسب پنهان ولی موجود
  basicA11y(h + sb);
});

test("Tabs و Accordion", () => {
  const t = render(<Tabs label="جزئیات" items={[{ value: "a", label: "مشخصات", content: "x" }, { value: "b", label: "نظرات", content: "y" }]} />);
  assert.match(t, /role="tablist" aria-label="جزئیات"/);
  assert.equal(count(t, /role="tab"/g), 2);
  assert.match(t, /aria-selected="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-selected="true"/);
  assert.match(t, /aria-selected="false"[^>]*tabindex="-1"|tabindex="-1"[^>]*aria-selected="false"/);
  assert.equal(count(t, /role="tabpanel"/g), 2);
  assert.equal(count(t, /role="tabpanel"[^>]* hidden/g), 1); // فقط پنل غیرفعال مخفی است
  const a = render(<Accordion items={[{ value: "1", title: "ارسال", content: "..." }, { value: "2", title: "گارانتی", content: "..." }]} defaultOpen={["2"]} headingLevel={3} />);
  assert.equal(count(a, /<h3/g), 2);
  assert.equal(count(a, /aria-expanded="true"/g), 1);
  assert.equal(count(a, /aria-expanded="false"/g), 1);
  assert.equal(count(a, /role="region"[^>]* hidden/g), 1);
  basicA11y(t + a);
});

test("Modal بسته، Tooltip، Badge، Alert", () => {
  const m = render(<Modal open={false} onClose={() => {}} title="فیلترها">محتوا</Modal>);
  assert.match(m, /<dialog[^>]*aria-labelledby=/);
  assert.doesNotMatch(m, /<dialog[^>]* open/);
  assert.match(m, /<h2[^>]*>فیلترها<\/h2>/);
  assert.match(m, /aria-label="بستن"/);
  const tip = render(<Tooltip label="راهنما"><button type="button">؟</button></Tooltip>);
  assert.match(tip, /role="tooltip"[^>]* hidden/);
  assert.match(tip, /aria-describedby=/);
  assert.match(render(<Alert tone="danger" title="خطا">پرداخت ناموفق</Alert>), /role="alert"/);
  assert.match(render(<Alert tone="info">اطلاع</Alert>), /role="status"/);
  assert.match(render(<Badge tone="warning" icon="clock">قدیمی</Badge>), /cx-badge--warning/);
  basicA11y(m + tip);
});

test("PriceTag: حالت‌های قیمت", () => {
  const today = new Date("2026-11-15T10:00:00Z");
  const exact = render(<PriceTag finalToman={12_500_000} oldToman={14_000_000} discountPercent={10} finalUsdCents={12_000} checkedOn="2026-11-14" today={today} />);
  assert.match(exact, /<data value="12500000"[^>]*>۱۲٬۵۰۰٬۰۰۰ تومان<\/data>/);
  assert.match(exact, /قیمت قبلی/);
  assert.match(exact, /<s [^>]*>۱۴٬۰۰۰٬۰۰۰ تومان<\/s>/);
  assert.match(exact, /۱۰٪ تخفیف/);
  assert.match(exact, /dir="ltr">\$120</);
  assert.doesNotMatch(exact, /قدیمی/); // تازه است
  const stale = render(<PriceTag finalToman={5_000_000} checkedOn="2026-10-11" today={today} />);
  assert.doesNotMatch(stale, /قدیمی/); // پیام هشدار قدیمی بودن حذف شد
  const approx = render(<PriceTag finalToman={5_000_000} note="approx" checkedOn="2026-11-15" today={today} />);
  assert.match(approx, /حدود/);
  assert.doesNotMatch(approx, /قابل خرید نیست/);
  assert.match(render(<PriceTag finalToman={5_000_000} note="from" checkedOn="2026-11-15" today={today} />), /cx-price__prefix">از</);
  assert.match(render(<PriceTag finalToman={null} />), /تماس بگیرید/);
  assert.doesNotMatch(render(<PriceTag finalToman={5_000_000} showUsd={false} finalUsdCents={100} checkedOn="2026-11-15" today={today} />), /\$1/);
});

test("موجودی: آیکون و متن", () => {
  assert.match(render(<StockIndicator stock={10} />), /موجود/);
  assert.match(render(<StockIndicator stock={2} />), /فقط ۲ عدد باقی مانده/);
  assert.match(render(<StockIndicator stock={0} />), /ناموجود/);
  assert.match(render(<StockIndicator stock={9} purchasable={false} />), /فقط مشاهده/);
  assert.match(render(<StockIndicator stock={2} />), /<svg/); // رنگ تنها نیست
});

const product = { slug: "x", name: "Galaxy S25 Ultra", brand: "سامسونگ", href: "/p/x", imageSrc: "/p.webp", finalToman: 50_000_000, stock: 5, highlights: ["۱۲ گیگ رم", "۲۵۶ گیگ حافظه"] } as const;

test("ProductCard: ساختار معنایی و CLS", () => {
  const h = render(<ProductCard product={product} today={new Date("2026-11-15")} actions={<IconButton icon="heart" label="علاقه‌مندی" />} />);
  assert.match(h, /^<article/);
  assert.match(h, /<h3[^>]*><a href="\/p\/x"[^>]*><bdi>Galaxy S25 Ultra<\/bdi><\/a><\/h3>/);
  assert.match(h, /<img [^>]*alt=""[^>]*width="400"[^>]*height="500"[^>]*loading="lazy"/);
  assert.equal(count(h, /href="\/p\/x"/g), 1); // پیوند تکراری ندارد
  assert.match(h, /۱۲ گیگ رم · ۲۵۶ گیگ حافظه/);
  const hero = render(<ProductCard product={product} priority />);
  assert.match(hero, /loading="eager"/);
  assert.match(hero, /fetchPriority="high"/i);
  assert.doesNotMatch(render(<ProductCard product={product} variant="compact" />), /موجود/);
  assert.match(render(<ProductCard product={product} variant="list" />), /cx-card--list/);
  assert.match(render(<ProductCardSkeleton />), /aria-hidden="true"/);
  assert.match(render(<Skeleton />), /cx-skel/);
  basicA11y(h + hero);
});

test("Gallery", () => {
  const imgs = [1, 2, 3].map((n) => ({ src: `/i${n}.webp`, alt: `نمای ${n}`, width: 800, height: 1000 }));
  const h = render(<Gallery images={imgs} productName="Galaxy" />);
  assert.match(h, /role="group"[^>]*aria-roledescription="گالری تصاویر"/);
  assert.match(h, /<img src="\/i1.webp" alt="نمای 1" width="800" height="1000"/);
  assert.equal(count(h, /aria-label="نمایش تصویر/g), 3);
  assert.equal(count(h, /aria-current="true"/g), 1);
  assert.match(h, /تصویر بعدی/);
  assert.match(h, /۱ از ۳/);
  assert.doesNotMatch(render(<Gallery images={imgs.slice(0, 1)} productName="x" />), /تصویر بعدی/); // تک‌تصویر: بدون ناوبری
  assert.equal(render(<Gallery images={[]} productName="x" />), "");
  basicA11y(h);
});

test("ناوبری: Breadcrumb، Pagination، Stepper", () => {
  const b = render(<Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "گوشی", href: "/c" }, { label: "Galaxy" }]} />);
  assert.match(b, /<nav aria-label="مسیر صفحه"/);
  assert.equal(count(b, /aria-current="page"/g), 1);
  assert.equal(count(b, /<a /g), 2);
  const p = render(<Pagination current={5} total={10} hrefFor={(n) => `?page=${n}`} />);
  assert.match(p, /href="\?page=4"/);
  assert.match(p, /aria-current="page">۵</);
  assert.equal(count(p, /…/g), 2);
  const first = render(<Pagination current={1} total={3} />);
  assert.match(first, /class="cx-page cx-page--disabled" aria-disabled="true"/);
  assert.match(first, /<span class="cx-sr-only">[^<]+<\/span>/);
  assert.equal(render(<Pagination current={1} total={1} />), "");
  const s = render(<Stepper steps={["نشانی", "ارسال", "پرداخت"]} current={1} />);
  assert.equal(count(s, /aria-current="step"/g), 1);
  assert.match(s, /\(انجام شد\)/);
  basicA11y(b + p + s);
});

test("SpecTable و CompareTable", () => {
  const spec = render(<SpecTable groups={[{ title: "نمایشگر", rows: [{ label: "اندازه", value: 6.8 }, { label: "NFC", value: true }, { label: "پرده", value: null }] }]} />);
  assert.match(spec, /<caption class="cx-sr-only">مشخصات فنی/);
  assert.match(spec, /scope="colgroup"/);
  assert.match(spec, /scope="row"/);
  assert.match(spec, /<bdi>۶\.۸<\/bdi>/); // مقدار داخل bdi تا متن لاتین در RTL به‌هم نریزد
  assert.match(spec, />دارد</);
  assert.match(spec, />—</);
  const cmp = render(<CompareTable products={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} rows={[{ key: "ram", label: "رم", values: [8, 12] }, { key: "os", label: "سیستم", values: ["x", "x"] }]} onRemove={() => {}} />);
  assert.match(cmp, /role="region"[^>]*tabindex="0"|tabindex="0"[^>]*role="region"/);
  assert.match(cmp, /\(متفاوت\)/);
  assert.equal(count(cmp, /\(متفاوت\)/g), 1); // فقط سطر رم
  assert.match(cmp, /aria-label="حذف A از مقایسه"/);
  assert.match(cmp, /scope="col"/);
  basicA11y(spec + cmp);
});

test("OtpInput", () => {
  const h = render(<OtpInput onComplete={() => {}} error="کد اشتباه است" />);
  assert.equal(count(h, /<input/g), 6);
  assert.equal(count(h, /autoComplete="one-time-code"|autocomplete="one-time-code"/gi), 1);
  assert.equal(count(h, /inputMode="numeric"|inputmode="numeric"/gi), 6);
  assert.match(h, /dir="ltr"/);
  assert.match(h, /aria-label="رقم ۱ از ۶"/);
  assert.match(h, /aria-invalid="true"/);
  assert.match(h, /role="group"/);
  basicA11y(h);
});

test("تعداد، تایمر، خط زمان", () => {
  const q = render(<QuantityStepper value={1} max={3} itemName="Galaxy" onChange={() => {}} />);
  assert.match(q, /role="group" aria-label="تعداد Galaxy"/);
  assert.match(q, /aria-label="کم‌کردن تعداد Galaxy"[^>]*disabled|disabled[^>]*aria-label="کم‌کردن تعداد Galaxy"/); // در حد min
  assert.match(q, /value="۱"/);
  const cd = render(<Countdown expiresAt={Date.now() + 600_000} />);
  assert.match(cd, /زمان باقی‌ماندهٔ رزرو/);
  assert.doesNotMatch(cd, /<time/); // SSR بدون زمان تا ناسازگاری هیدراسیون نباشد
  const tl = render(<OrderTimeline status="shipped" />);
  assert.equal(count(tl, /aria-current="step"/g), 1);
  assert.equal(count(tl, /\(انجام شد\)/g), 3);
  assert.match(render(<OrderTimeline status="needs_review" />), /cx-timeline__step--warning/);
  basicA11y(q + cd + tl);
});

test("نمودار قیمت", () => {
  const d = [
    { label: "۱۴۰۵/۷/۱", t: 0, v: 52_000_000 },
    { label: "۱۴۰۵/۷/۱۵", t: 1000, v: 50_000_000 },
  ];
  const h = render(<PriceHistoryChart data={d} />);
  assert.match(h, /role="img"[^>]*aria-label="تاریخچهٔ قیمت: کمترین ۵۰٬۰۰۰٬۰۰۰ تومان، بیشترین ۵۲٬۰۰۰٬۰۰۰ تومان، قیمت فعلی ۵۰٬۰۰۰٬۰۰۰ تومان\./);
  assert.match(h, /<table>/); // جدول جایگزین برای صفحه‌خوان
  assert.equal(count(h, /<tr>/g), 3);
  assert.match(render(<PriceHistoryChart data={[]} />), /هنوز تاریخچه‌ای/);
});

test("فرم نشانی و فیلترها", () => {
  const a = render(<AddressForm onSubmit={() => {}} />);
  assert.match(a, /<form[^>]*novalidate/i);
  for (const n of ["receiverName", "receiverPhone", "province", "city", "postalCode", "street", "plate", "unit"]) assert.match(a, new RegExp(`name="${n}"`));
  assert.match(a, /autoComplete="postal-code"|autocomplete="postal-code"/i);
  assert.match(a, /type="submit"/);
  const f = render(<FilterPanel groups={[{ id: "brand", label: "برند", options: [{ value: "s", label: "سامسونگ", count: 12 }, { value: "a", label: "اپل", count: 3 }] }]} selected={{ brand: ["s"] }} onChange={() => {}} onClear={() => {}} />);
  assert.match(f, /<legend[^>]*>برند<\/legend>/);
  assert.match(f, /<span class="cx-check__count">۱۲<\/span>/);
  assert.match(f, /\(۱\)/);
  assert.match(f, /پاک‌کردن همه/);
  assert.equal(count(f, /type="checkbox"/g), 2);
  basicA11y(a + f);
});

test("حالت‌ها، برند و رنگ تطبیقی", () => {
  assert.match(render(<ErrorState />), /role="alert"/);
  assert.match(render(<EmptyState title="خالی" description="چیزی نیست" />), /<h2[^>]*>خالی<\/h2>/);
  assert.match(render(<BrandMark wordmark="Codex" />), /var\(--cx-gold\)/);
  const ac = render(<AdaptiveAccent dominant="#2563EB">x</AdaptiveAccent>);
  assert.match(ac, /--cx-adaptive-l:#[0-9A-F]{6}/i);
  assert.match(ac, /--cx-adaptive-d:#[0-9A-F]{6}/i);
});
