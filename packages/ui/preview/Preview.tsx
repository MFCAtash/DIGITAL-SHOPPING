import { useState } from "react";
import type { ReactNode } from "react";
import {
  Accordion, AddressForm, AdaptiveAccent, Alert, Badge, BrandMark, Breadcrumb, Button, ButtonLink, Checkbox, Combobox, CompareTable, Countdown, EmptyState, ErrorState,
  FilterPanel, FilterSheet, Gallery, IconButton, Icon, MiniCart, Modal, OrderTimeline, OtpInput, Pagination, PriceHistoryChart, PriceTag, ProductCard, ProductCardSkeleton,
  QuantityStepper, RadioGroup, SearchBox, SelectField, SortMenu, SpecTable, Stepper, StockIndicator, Switch, Tabs, TextField, ToastProvider, useToast, colors, contrastPairs, contrastRatio,
  type CartLine, type FilterSelection, type OrderStatus, type ProductSummary,
} from "../src";

export interface CatalogItem {
  slug: string; name: string; brand: string; usd_cents: number | null; discount_percent?: number; price_note?: string | null; stock: number;
  specs?: Record<string, string>; images: { file: string; alt: string }[]; dominant: string | null;
}
export interface PreviewData { items: CatalogItem[]; rate: number; imageBase: string; today: string }

const SPEC_LABELS: Record<string, string> = { display: "نمایشگر", cpu: "پردازنده", ram: "رم", storage: "حافظه", camera: "دوربین", front_camera: "دوربین سلفی", battery: "باتری", pen: "قلم" };

const toToman = (cents: number, rate: number, discount = 0) => Math.round(((cents / 100) * (1 - discount / 100) * rate) / 1000) * 1000;

function summary(it: CatalogItem, d: PreviewData): ProductSummary {
  const disc = it.discount_percent ?? 0;
  return {
    slug: it.slug, name: it.name, brand: it.brand, href: `#${it.slug}`,
    imageSrc: it.images[0] ? `${d.imageBase}/${it.images[0].file}` : undefined, imageWidth: 400, imageHeight: 500,
    finalToman: it.usd_cents === null ? null : toToman(it.usd_cents, d.rate, disc),
    oldToman: it.usd_cents !== null && disc > 0 ? toToman(it.usd_cents, d.rate) : null,
    finalUsdCents: it.usd_cents === null ? null : Math.round(it.usd_cents * (1 - disc / 100)),
    discountPercent: disc, priceNote: (it.price_note as "from" | "approx" | null) ?? null, priceCheckedOn: d.today, stock: it.stock, purchasable: it.price_note !== "approx",
    highlights: [it.specs?.ram, it.specs?.storage].filter((x): x is string => !!x),
  };
}

function Block({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`pv-block${wide ? " pv-block--wide" : ""}`}>
      <h3 className="pv-block__title">{title}</h3>
      <div className="pv-block__body">{children}</div>
    </section>
  );
}

function Swatches() {
  const keys = Object.keys(colors.light) as (keyof typeof colors.light)[];
  return (
    <div className="pv-swatches">
      {(["light", "dark"] as const).map((t) => (
        <div key={t} className="pv-swatch-col">
          <h4>{t === "light" ? "تم روشن" : "تم تاریک"}</h4>
          {keys.map((k) => (
            <div key={k} className="pv-swatch">
              <span className="pv-swatch__chip" style={{ background: colors[t][k] }} />
              <code>{k}</code>
              <span className="pv-swatch__hex" dir="ltr">{colors[t][k]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Contrast() {
  return (
    <table className="pv-contrast">
      <thead><tr><th scope="col">جفت</th><th scope="col">روشن</th><th scope="col">تاریک</th><th scope="col">حداقل</th></tr></thead>
      <tbody>
        {contrastPairs.map((p) => (
          <tr key={`${p.fg}-${p.bg}`}>
            <th scope="row" dir="ltr">{p.fg} / {p.bg}</th>
            <td dir="ltr">{contrastRatio(colors.light[p.fg], colors.light[p.bg]).toFixed(2)}</td>
            <td dir="ltr">{contrastRatio(colors.dark[p.fg], colors.dark[p.bg]).toFixed(2)}</td>
            <td dir="ltr">{p.min}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ToastDemo() {
  const t = useToast();
  return (
    <div className="pv-row">
      <Button onClick={() => t.show("به سبد اضافه شد", { tone: "success" })}>اعلان موفق</Button>
      <Button onClick={() => t.show("پرداخت ناموفق بود. دوباره تلاش کنید.", { tone: "danger" })}>اعلان خطا</Button>
    </div>
  );
}

export function Preview({ data }: { data: PreviewData }) {
  const priced = data.items.filter((i) => i.usd_cents && i.images.length && i.price_note !== "approx");
  const hero = priced.find((i) => i.images.length >= 2) ?? priced[0]!;
  const list = priced.filter((i) => i.slug !== hero.slug).slice(0, 8);
  const heroSum = summary(hero, data);

  const [tab, setTab] = useState("specs");
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [qty, setQty] = useState(1);
  const [dark, setDark] = useState(false);
  const [filters, setFilters] = useState<FilterSelection>({ brand: ["Samsung"] });
  const [sheet, setSheet] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [sw, setSw] = useState(true);
  const [radio, setRadio] = useState("post");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(3);
  const [otp, setOtp] = useState("");
  const [lines, setLines] = useState<CartLine[]>(() =>
    list.slice(0, 2).map((it, i) => ({ id: it.slug, name: it.name, href: `#${it.slug}`, imageSrc: `${data.imageBase}/${it.images[0]!.file}`, unitToman: toToman(it.usd_cents!, data.rate, it.discount_percent ?? 0), qty: i + 1, maxQty: Math.min(3, it.stock), warning: i === 1 ? "قیمت از آخرین بازدید تغییر کرده است" : undefined })),
  );

  const specGroups = [{ title: "مشخصات اصلی", rows: Object.entries(hero.specs ?? {}).map(([k, v]) => ({ label: SPEC_LABELS[k] ?? k, value: v })) }];
  const history = [
    { label: "۱۴۰۵/۶/۱", t: 0, v: heroSum.finalToman! * 1.08 }, { label: "۱۴۰۵/۶/۲۰", t: 1, v: heroSum.finalToman! * 1.04 },
    { label: "۱۴۰۵/۷/۱۰", t: 3, v: heroSum.finalToman! * 1.04 }, { label: "۱۴۰۵/۷/۲۵", t: 4, v: heroSum.finalToman! },
  ];
  const brands = [...new Set(priced.map((i) => i.brand))];
  const cmp = priced.slice(0, 3);
  const cmpKeys = ["ram", "storage", "battery", "pen"];

  return (
    <ToastProvider>
      <a href="#main" className="cx-skip">رفتن به محتوا</a>
      <header className="pv-header">
        <div className="pv-wrap pv-header__in">
          <BrandMark wordmark="کُدکس" />
          <SearchBox query={q} onQueryChange={setQ} onSearch={() => {}} suggestions={priced.slice(0, 5).map((i) => ({ value: i.slug, label: i.name, hint: i.brand }))} />
          <div className="pv-header__actions">
            <IconButton icon="user" label="حساب کاربری" />
            <IconButton icon="heart" label="علاقه‌مندی‌ها" />
            <IconButton icon="compare" label="مقایسه" badge={2} />
            <IconButton icon="cart" label="سبد خرید" badge={3} onClick={() => setCartOpen(true)} />
            <Switch checked={dark} label="تاریک" onCheckedChange={(v) => { setDark(v); document.documentElement.dataset.theme = v ? "dark" : "light"; }} />
          </div>
        </div>
      </header>

      <main id="main" className="pv-wrap">
        <Breadcrumb className="pv-crumb" items={[{ label: "خانه", href: "#" }, { label: "گوشی موبایل", href: "#" }, { label: hero.brand, href: "#" }, { label: hero.name }]} />

        {/* صفحهٔ محصول: چیدمان نامتقارن ۷/۵ */}
        <AdaptiveAccent dominant={hero.dominant ?? "#5E6168"}>
          <article className="pv-pdp" id="pdp">
            <div className="pv-pdp__media">
              <Gallery productName={hero.name} images={hero.images.map((im) => ({ src: `${data.imageBase}/${im.file}`, alt: im.alt, width: 800, height: 1000 }))} />
            </div>
            <div className="pv-pdp__info">
              <p className="pv-eyebrow">{hero.brand} · گوشی موبایل</p>
              <h1 className="pv-title"><bdi>{hero.name}</bdi></h1>
              <div className="cx-adaptive__rule">
                <span className="cx-adaptive__chip">نسخهٔ <bdi>{hero.specs?.storage ?? ""}</bdi></span>
              </div>
              <PriceTag size="lg" {...{ finalToman: heroSum.finalToman, oldToman: heroSum.oldToman, finalUsdCents: heroSum.finalUsdCents, discountPercent: heroSum.discountPercent, note: heroSum.priceNote, checkedOn: data.today, today: new Date(data.today) }} />
              <StockIndicator stock={hero.stock} />
              <div className="pv-cta">
                <QuantityStepper value={qty} onChange={setQty} max={3} itemName={hero.name} />
                <Button variant="primary" size="lg" iconStart={<Icon name="cart" />}>افزودن به سبد</Button>
                <IconButton icon="heart" label="افزودن به علاقه‌مندی" variant="secondary" size="lg" />
              </div>
              <ul className="pv-assure">
                <li><Icon name="truck" /> ارسال به سراسر کشور؛ هزینه در مرحلهٔ بعد محاسبه می‌شود</li>
                <li><Icon name="shield" /> گارانتی اصالت و سلامت فیزیکی کالا</li>
                <li><Icon name="clock" /> رزرو موجودی تا ۱۵ دقیقه پس از ثبت سفارش</li>
              </ul>
              <Button variant="ghost" iconStart={<Icon name="bell" />}>خبرم کن اگر قیمت کم شد</Button>
            </div>
          </article>
        </AdaptiveAccent>

        <Tabs label="جزئیات کالا" value={tab} onValueChange={setTab} className="pv-tabs" items={[
          { value: "specs", label: "مشخصات فنی", content: <SpecTable groups={specGroups} /> },
          { value: "history", label: "تاریخچهٔ قیمت", content: <PriceHistoryChart data={history} /> },
          { value: "faq", label: "پرسش‌ها", content: <Accordion type="single" defaultOpen={["a"]} items={[{ value: "a", title: "گارانتی چند ماهه است؟", content: "گارانتی ۱۸ ماههٔ اصالت و سلامت فیزیکی؛ سریال را در صفحهٔ استعلام ثبت کنید." }, { value: "b", title: "امکان تعویض هست؟", content: "تا ۷ روز با شرایط اعلام‌شده در صفحهٔ مرجوعی." }]} /> },
        ]} />

        {/* فهرست: نوار فیلتر + شبکهٔ کارت */}
        <section className="pv-list" aria-labelledby="list-h">
          <aside className="pv-list__side">
            <FilterPanel groups={[{ id: "brand", label: "برند", options: brands.map((b) => ({ value: b, label: b, count: priced.filter((i) => i.brand === b).length })) }]} selected={filters} onChange={setFilters} onClear={() => setFilters({})} />
          </aside>
          <div className="pv-list__main">
            <div className="pv-list__bar">
              <h2 id="list-h">گوشی و لپ‌تاپ</h2>
              <div className="pv-row">
                <Button className="pv-only-mobile" variant="secondary" iconStart={<Icon name="filter" />} onClick={() => setSheet(true)}>فیلترها</Button>
                <SortMenu value={sort} onChange={setSort} options={[{ value: "new", label: "جدیدترین" }, { value: "price_asc", label: "ارزان‌ترین" }, { value: "price_desc", label: "گران‌ترین" }]} />
              </div>
            </div>
            <ul className="pv-grid">
              {list.slice(0, 6).map((it, i) => (
                <li key={it.slug}>
                  <ProductCard product={summary(it, data)} today={new Date(data.today)} priority={i < 2} actions={<><IconButton icon="heart" label={`علاقه‌مندی ${it.name}`} size="sm" /><IconButton icon="compare" label={`مقایسهٔ ${it.name}`} size="sm" /></>} />
                </li>
              ))}
              <li><ProductCardSkeleton /></li>
            </ul>
            <Pagination current={page} total={12} onChange={setPage} />
          </div>
        </section>

        <h2 className="pv-h2">کتابخانهٔ کامپوننت‌ها</h2>
        <div className="pv-blocks">
          <Block title="دکمه‌ها">
            <div className="pv-row"><Button variant="primary">ثبت سفارش</Button><Button>مقایسه</Button><Button variant="ghost">بعداً</Button><Button variant="danger">حذف</Button><Button variant="primary" loading>در حال ارسال</Button><Button disabled>غیرفعال</Button></div>
            <div className="pv-row"><Button size="sm">کوچک</Button><Button size="lg" variant="secondary">بزرگ</Button><ButtonLink href="#" variant="secondary">پیوند دکمه‌ای</ButtonLink></div>
          </Block>
          <Block title="قیمت و موجودی">
            <PriceTag finalToman={50_000_000} oldToman={56_000_000} discountPercent={10} finalUsdCents={50_000} checkedOn={data.today} today={new Date(data.today)} />
            <PriceTag finalToman={50_000_000} note="from" checkedOn={data.today} today={new Date(data.today)} />
            <PriceTag finalToman={50_000_000} note="approx" checkedOn={data.today} today={new Date(data.today)} />
            <PriceTag finalToman={50_000_000} checkedOn="2026-10-11" today={new Date(data.today)} />
            <PriceTag finalToman={null} />
            <div className="pv-row"><StockIndicator stock={12} /><StockIndicator stock={2} /><StockIndicator stock={0} /><StockIndicator stock={5} purchasable={false} /></div>
          </Block>
          <Block title="فیلدها">
            <TextField label="نام و نام خانوادگی" placeholder="مثلاً علی رضایی" hint="مطابق کارت ملی" />
            <TextField label="شمارهٔ موبایل" contentDir="ltr" defaultValue="0912" error="شمارهٔ موبایل باید ۱۱ رقم باشد." />
            <SelectField label="روش ارسال" options={[{ value: "post", label: "پست پیشتاز" }, { value: "courier", label: "پیک شهری" }]} />
            <Combobox label="استان" options={["تهران", "فارس", "خراسان رضوی", "اصفهان"].map((v) => ({ value: v, label: v }))} value={province} onValueChange={setProvince} placeholder="نام استان را بنویسید" />
          </Block>
          <Block title="انتخاب‌ها">
            <Checkbox label="دریافت پیامک تخفیف" defaultChecked />
            <Checkbox label="قوانین را می‌پذیرم" />
            <RadioGroup legend="روش ارسال" name="ship" value={radio} onChange={setRadio} options={[{ value: "post", label: "پست پیشتاز", hint: "۳ تا ۵ روز" }, { value: "courier", label: "پیک شهری", hint: "همان روز (تهران)" }]} />
            <Switch checked={sw} onCheckedChange={setSw} label="اعلان تغییر قیمت" />
          </Block>
          <Block title="OTP و تعداد و تایمر">
            <OtpInput onComplete={setOtp} error={otp === "000000" ? "کد اشتباه است." : undefined} />
            <p className="pv-note" data-testid="otp-out">کد واردشده: {otp || "—"}</p>
            <div className="pv-row"><QuantityStepper value={qty} onChange={setQty} max={5} itemName="کالا" /><Countdown expiresAt={Date.now() + 14 * 60_000 + 59_000} /></div>
          </Block>
          <Block title="مراحل و وضعیت سفارش">
            <Stepper steps={["نشانی", "ارسال", "پرداخت"]} current={1} />
            {(["shipped", "needs_review"] as OrderStatus[]).map((s) => <OrderTimeline key={s} status={s} />)}
          </Block>
          <Block title="نشان‌ها، هشدارها، اعلان">
            <div className="pv-row"><Badge>پرفروش</Badge><Badge tone="positive" icon="check">گارانتی دار</Badge><Badge tone="warning" icon="clock">قیمت قدیمی</Badge><Badge tone="danger" icon="alert">ناموجود</Badge></div>
            <Alert tone="warning" title="قیمت تغییر کرده است">قیمت این کالا از آخرین بازدید شما عوض شده؛ مبلغ نهایی در مرحلهٔ پرداخت قطعی می‌شود.</Alert>
            <Alert tone="danger" title="پرداخت ناموفق">مبلغی از حساب شما کسر نشده است. دوباره تلاش کنید.</Alert>
            <ToastDemo />
          </Block>
          <Block title="پنجره‌ها">
            <div className="pv-row"><Button onClick={() => setModal(true)}>باز کردن پنجرهٔ گفتگو</Button><Button onClick={() => setCartOpen(true)}>سبد (Sheet)</Button><Button onClick={() => setSheet(true)}>فیلتر (Sheet)</Button></div>
          </Block>
          <Block title="حالت‌های خالی و خطا">
            <EmptyState title="کالایی پیدا نشد" description="فیلترها را کم کنید یا عبارت دیگری جست‌وجو کنید." action={<Button variant="secondary">پاک‌کردن فیلترها</Button>} />
            <ErrorState action={<Button variant="secondary">تلاش دوباره</Button>} />
          </Block>
          <Block title="فرم نشانی" wide>
            <AddressForm onSubmit={() => {}} citiesFor={(p) => (p === "تهران" ? ["تهران", "ری", "شمیرانات"] : [])} />
          </Block>
          <Block title="مقایسه" wide>
            <CompareTable products={cmp.map((i) => ({ id: i.slug, name: i.name, href: `#${i.slug}`, imageSrc: `${data.imageBase}/${i.images[0]!.file}` }))} rows={cmpKeys.map((k) => ({ key: k, label: SPEC_LABELS[k] ?? k, values: cmp.map((i) => i.specs?.[k] ?? null) }))} onRemove={() => {}} />
          </Block>
          <Block title="رنگ‌ها" wide><Swatches /></Block>
          <Block title="کنتراست توکن‌ها (سنجیده‌شده)" wide><Contrast /></Block>
        </div>
      </main>

      <footer className="pv-footer"><div className="pv-wrap"><BrandMark wordmark="کُدکس" /><p>نمونهٔ سیستم طراحی؛ نرخ ارز نمایشی ({data.rate.toLocaleString("en")} تومان) و فونت‌های نهایی بارگذاری نشده‌اند.</p></div></footer>

      <Modal open={modal} onClose={() => setModal(false)} title="حذف از سبد" footer={<div className="pv-row"><Button variant="danger" onClick={() => setModal(false)}>حذف</Button><Button onClick={() => setModal(false)}>انصراف</Button></div>}>
        این کالا از سبد حذف شود؟
      </Modal>
      <FilterSheet open={sheet} onClose={() => setSheet(false)} resultCount={12} groups={[{ id: "brand", label: "برند", options: brands.map((b) => ({ value: b, label: b, count: 4 })) }]} selected={filters} onChange={setFilters} onClear={() => setFilters({})} />
      <MiniCart open={cartOpen} onClose={() => setCartOpen(false)} lines={lines} checkoutHref="#checkout" onQtyChange={(id, q2) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: q2 } : l)))} onRemove={(id) => setLines((ls) => ls.filter((l) => l.id !== id))} />
    </ToastProvider>
  );
}
