/**
 * لایهٔ i18n سبک: فارسی زبان اول و انگلیسی زبان دوم است. زبان آلمانی طبق تصمیم فاز ۶–۱۲
 * به تعویق افتاده تا از ترجمههای ناقص و تجربهٔ بد جلوگیری شود.
 */
export type Locale = "fa" | "en";

export const LOCALES: readonly Locale[] = ["fa", "en"];

/** نام کوکی زبان (هم در سرور و هم در کلاینت استفاده میشود). */
export const LOCALE_COOKIE = "cx_locale";

type Dict = Record<string, string>;

const fa: Dict = {
  "nav.home": "خانه", "nav.products": "کالاها", "nav.search": "جستجو", "nav.cart": "سبد خرید",
  "nav.account": "حساب من", "nav.compare": "مقایسه", "nav.categories": "دستهبندیها", "nav.menu": "باز کردن منو",
  "nav.signIn": "ثبت نام و ورود",
  "login.title": "ورود یا ثبت نام",
  "login.subtitle": "با شمارهٔ موبایل خود وارد شوید؛ کد تأیید در چند ثانیه ارسال میشود.",
  "login.phone": "شمارهٔ موبایل",
  "login.getCode": "دریافت کد تأیید",
  "login.codeSent": "کد تأیید به شمارهٔ زیر ارسال شد",
  "login.verify": "تأیید و ورود",
  "login.resend": "ارسال مجدد کد",
  "login.success": "با موفقیت وارد شدید",
  "login.forgot": "فراموشی رمز عبور",
  "login.hint": "اولین بار است؟ با همین شماره حساب شما ساخته میشود.",
  "login.invalidPhone": "شمارهٔ موبایل معتبر وارد کنید",
  "login.error": "ورود ممکن نشد. دوباره تلاش کنید.",
  "brand.home": "Digital Shopping — صفحهٔ خانه",
  "hero.eyebrow": "فروشگاه الکترونیک", "hero.titleA": "تکنولوژی اصیل، قیمتی شفاف",
  "hero.titleB": "قیمت واقعی، مقایسهٔ واقعی",
  "hero.descA": "گوشی، لپتاپ و لوازم الکترونیکی با قیمت بهروز و امکان مقایسهٔ واقعی. هر آگهی پیش از انتشار از نظر قیمت، عکس و مشخصات بررسی میشود.",
  "hero.descB": "دیگر لازم نیست بین تبلیغات و مشخصات واقعی حدس بزنید. قیمت، تاریخ بررسی و مشخصات استانداردشده در یک صفحه.",
  "hero.cta": "دیدن کالاها", "hero.proof": "چرا Digital Shopping؟",
  "trust.authenticity": "اصالت کالا", "trust.shipping": "ارسال شفاف", "trust.fresh": "قیمت بهروز", "trust.compare": "مقایسهٔ واقعی",
  "home.categories": "از کجا شروع کنیم؟", "home.allCategories": "همهٔ دستهها ←", "home.new": "تازهترین کالاها",
  "home.deals": "کالاهای تخفیفدار", "home.popular": "بیشترین خریداران", "home.all": "همه ←",
  "home.editorial": "رویکرد ما", "home.editorialTitle": "Specification sheet، نه تبلیغات",
  "home.steps": "چگونه کار میکند", "home.stepsTitle": "سه گام تا خرید مطمئن",
  "home.stats": "در اعداد", "home.price": "تاریخچهٔ قیمت", "home.voice": "تجربهٔ خرید",
  "home.faq": "راهنما", "home.faqTitle": "پرسشهای رایج", "home.startCompare": "شروع مقایسه",
  "plp.title": "همهٔ کالاها", "plp.search": "نتایج جستجو", "plp.filters": "فیلترها",
  "plp.showPrefix": "نمایش", "plp.showSuffix": "کالا", "plp.sort": "مرتبسازی",
  "plp.found": "کالا یافت شد", "plp.empty": "کالایی با این فیلترها پیدا نشد.", "plp.clear": "پاک کردن فیلترها",
  "plp.category": "دسته", "plp.brand": "برند", "plp.ram": "رم", "plp.storage": "حافظه", "plp.priceRange": "بازهٔ قیمت",
  "plp.inStock": "فقط موجود", "plp.onSale": "تخفیفدار", "plp.gig": "گیگ",
  "plp.minPrice": "حداقل بها (دلار)", "plp.maxPrice": "حداکثر بها (دلار)", "plp.applyPrice": "اعمال محدوده", "plp.minRating": "حداقل امتیاز", "plp.purchasable": "قابل خرید", "plp.ratingUp": "و بالاتر",
  "sort.newest": "جدیدترین", "sort.priceAsc": "قیمت: کم به زیاد", "sort.priceDesc": "قیمت: زیاد به کم",
  "sort.rating": "بالاترین امتیاز", "sort.discount": "بیشترین تخفیف", "sort.popular": "محبوبترین",
  "pdp.specs": "مشخصات فنی", "pdp.history": "تاریخچهٔ قیمت", "pdp.reviews": "نظر خریداران",
  "pdp.priceLabel": "قیمت نهایی", "pdp.highlights": "مشخصات کلیدی",
  "pdp.related": "کالاهای مشابه", "pdp.add": "افزودن به سبد", "pdp.compare": "مقایسه", "pdp.wish": "علاقهمندی",
  "pdp.reviewForm": "نظر خود را ثبت کنید", "pdp.verified": "خرید تأییدشده", "pdp.noHistory": "تاریخچهای ثبت نشده است.",
  "cart.title": "سبد خرید", "cart.empty": "سبد خرید خالی است", "cart.checkout": "تکمیل خرید", "cart.remove": "حذف",
  "cart.loading": "در حال بارگذاری سبد…", "cart.emptyDesc": "کالایی که میپسندید را به سبد اضافه کنید.", "cart.items": "کالاها",
  "cart.unknownPrice": "قیمت نامشخص", "cart.summary": "خلاصهٔ سفارش", "cart.qty": "تعداد کالا", "cart.subtotal": "جمع کالاها",
  "cart.shippingNote": "هزینهٔ ارسال و مالیات در مرحلهٔ بعد محاسبه میشود.", "cart.continue": "ادامه و ثبت سفارش",
  "cart.priceChanged": "قیمت این کالا از آخرین بازدید شما تغییر کرده است.", "cart.outOfStock": "این کالا ناموجود شده است.", "cart.stockLow": "فقط {n} عدد موجود است.",
  "cart.blackFriday": "بلک فرایدی · تخفیف ویژه", "cart.each": "قیمت هر عدد", "cart.lineTotal": "جمع این کالا",
  "checkout.title": "تکمیل خرید", "checkout.coupon": "کد تخفیف", "checkout.apply": "اعمال", "checkout.pay": "پرداخت",
  "account.title": "حساب من", "account.overview": "نمای کلی", "account.orders": "سفارشها", "account.addresses": "نشانیها",
  "account.wishlist": "علاقهمندیها", "account.password": "رمز عبور", "account.returns": "مرجوعیها", "account.notifications": "اعلانها",
  "returns.title": "مرجوعیها", "returns.request": "درخواست مرجوعی", "returns.new": "درخواست تازه", "returns.reason": "دلیل مرجوعی",
  "returns.requested": "در انتظار بررسی", "returns.approved": "تأییدشده", "returns.rejected": "رد شده", "returns.refunded": "بازپرداخت شد",
  "notifications.title": "اعلانها", "notifications.unread": "خواندهنشده", "notifications.read": "علامت خواندهشده",
  "notifications.readAll": "علامتزنی همه بهعنوان خواندهشده", "notifications.empty": "اعلانی ثبت نشده است.",
  "footer.about": "درباره", "footer.help": "راهنما", "footer.legal": "قوانین", "footer.rights": "تمامی قیمتها به تومان نمایش داده میشود.",
  "footer.shop": "فروشگاه", "footer.buy": "خرید", "footer.trust": "اطمینان خاطر",
  "footer.allProducts": "همهٔ کالاها", "footer.newest": "تازهترینها", "footer.compareProducts": "مقایسهٔ محصولات",
  "footer.cart": "سبد خرید", "footer.track": "پیگیری سفارش", "footer.addresses": "نشانیها",
  "footer.guarantee": "گارانتی اصالت کالا", "footer.return7": "مرجوعی ۷ روزه", "footer.secure": "پرداخت امن",
  "footer.freshPrices": "قیمتهای بهروز", "footer.exactSpecs": "مشخصات فنی دقیق", "footer.privacy": "حریم خصوصی",
  "hero.trust1": "گارانتی اصالت کالا", "hero.trust2": "مرجوعی ۷ روزه", "hero.trust3": "قیمت بهروز", "hero.trust4": "پرداخت امن",
  "home.coverPhone": "آیفون", "home.coverGalaxy": "سامسونگ", "home.coverLaptop": "لپتاپ",
  "home.coverView": "محصولات برجسته", "home.navProducts": "کالاها", "home.navDeals": "تخفیفها",
  "home.navCompare": "مقایسه", "home.navAccount": "حساب من", "home.navDesign": "زبان طراحی",
  "trust.authenticityD": "هر آگهی پیش از انتشار بررسی میشود.", "trust.shippingD": "هزینه و زمان تحویل پیش از پرداخت مشخص است.",
  "trust.freshD": "تاریخ آخرین بررسی قیمت نمایش داده میشود.", "trust.compareD": "تا چهار کالا را ردیف به ردیف مقایسه کنید.",
  "home.new.desc": "آخرین آگهیهایی که بازبینی و منتشر شدهاند.", "home.deals.desc": "تخفیفها براساس قیمت مرجع ثبت شدهاند، نه عدد دلخواه.",
  "home.quote": "مشخصات استاندارد، قیمت قابل اثبات و تاریخ بررسی. سه چیزی که پیش از خرید باید بدانید.",
  "home.designLink": "زبان طراحی ما را ببینید ←", "home.step1": "فیلتر کنید", "home.step1d": "برند، رم، حافظه و بازهٔ قیمت را انتخاب کنید.",
  "home.step2": "مقایسه کنید", "home.step2d": "تا چهار کالا را ردیف به ردیف بسنجید.", "home.step3": "سفارش دهید",
  "home.step3d": "پرداخت امن، پیگیری سفارش و ارسال شفاف.", "home.stat1": "کالای قابل مقایسه بهطور همزمان",
  "home.stat2": "ثانیه تازهسازی فهرست و فاستها", "home.stat3": "روز مهلت مرجوعی", "home.stat4": "زبان رابط (فارسی و انگلیسی)",
  "home.priceNote": "قیمتها به تومان و براساس نرخ ثبتشده محاسبه میشوند؛ برچسب «تقریبی» یعنی بازبینی نهایی نشده است.",
  "home.voiceQuote": "اولین بار بود که بدون کلیک کردن ده صفحه، فهمیدم کدام گوشی واقعاً ارزش خرید دارد.",
  "home.faq1q": "آیا قیمتها بهروزاند؟", "home.faq1a": "تاریخ آخرین بررسی هر آگهی در صفحهٔ کالا نمایش داده میشود.",
  "home.faq2q": "چگونه کالاها را مقایسه میکنم؟", "home.faq2a": "از دکمهٔ مقایسه روی کارت کالا استفاده کنید و تا چهار محصول انتخاب نمایید.",
  "home.faq3q": "ارسال چگونه محاسبه میشود؟", "home.faq3a": "هزینهٔ ارسال براساس استان و مبلغ سبد (پس از تخفیف) در تسویه مشخص میشود.",
  "home.faq4q": "کد تخفیف را کجا وارد کنم؟", "home.faq4a": "در گام پرداخت صفحهٔ تسویه؛ تخفیف پیش از مالیات اعمال میشود.",
  "قیمت قبلی:": "Previous price:", "common.skip": "پرش به محتوا", "plp.searchFor": "نتایج برای",
  "common.retry": "تلاش دوباره", "common.backHome": "بازگشت به خانه", "common.notFound": "صفحه پیدا نشد",
  "common.notFoundDesc": "آدرس مورد نظر موجود نیست یا حذف شده است.", "common.errorTitle": "مشکلی پیش آمد",
  "common.errorDesc": "بارگذاری صفحه ممکن نشد. دوباره تلاش کنید.", "common.loading": "در حال بارگذاری…",
  "account.hello": "سلام", "account.guest": "کاربر مهمان", "account.logout": "خروج", "account.cartCount": "کالا در سبد",
  "account.subtotal": "جمع سبد", "account.viewOrders": "مشاهدهٔ سفارشها", "account.noOrders": "سفارشای ثبت نکردهاید.",
  "account.noAddresses": "نشانیای ثبت نکردهاید.", "account.addAddress": "افزودن نشانی", "account.editAddress": "ویرایش نشانی",
  "account.setDefault": "پیشفرض", "account.noWishlist": "علاقهمندیای ندارید.", "account.passwordTitle": "تنظیم رمز عبور",
  "account.currentPassword": "رمز فعلی", "account.newPassword": "رمز جدید", "account.repeatPassword": "تکرار رمز جدید",
  "account.changePassword": "تغییر رمز", "account.invalidCurrent": "رمز فعلی معتبر نیست.", "account.weak": "رمز معیارهای امنیتی را رعایت نمیکند.",
  "checkout.login": "ورود", "checkout.phone": "شمارهٔ موبایل", "checkout.code": "کد تأیید", "checkout.verify": "تأیید و ورود",
  "checkout.address": "نشانی", "checkout.shipping": "روش ارسال", "checkout.payment": "پرداخت", "checkout.orderSummary": "خلاصهٔ سفارش",
  "checkout.placeOrder": "ثبت سفارش", "checkout.payNow": "پرداخت", "checkout.success": "سفارش ثبت شد",
  "checkout.successDesc": "سفارش شما با موفقیت ایجاد شد.", "checkout.track": "پیگیری سفارش", "checkout.discount": "تخفیف",
  "review.title": "عنوان نظر", "review.body": "متن نظر", "review.submit": "ثبت نظر", "review.rating": "امتیاز",
  "order.status": "وضعیت", "order.number": "شمارهٔ سفارش", "order.date": "تاریخ سفارش", "order.items": "اقلام",
  "order.total": "جمع کل", "order.tracking": "کد پیگیری", "order.pay": "پرداخت", "order.cancel": "لغو سفارش",
  "order.expired": "مهلت پرداخت تمام شده است", "wishlist.add": "افزودن به علاقهمندیها", "wishlist.remove": "حذف از علاقهمندیها",
  "compare.empty": "کالایی برای مقایسه انتخاب نشده است.", "compare.onlyDiff": "فقط تفاوتها", "compare.remove": "حذف از مقایسه",
  "products.title": "کالاها", "pdp.guarantee": "گارانتی اصالت", "pdp.return7": "مرجوعی ۷ روزه", "pdp.fastShip": "ارسال سریع",
  "common.error": "مشکلی پیش آمد. دوباره تلاش کنید.", "common.cancel": "انصراف",
  "common.save": "ذخیره", "common.home": "خانه", "common.product": "کالاها",
  "common.close": "بستن", "common.continue": "ادامه", "common.errorShort": "خطا", "common.done": "انجام شد",
  "common.sent": "ارسال شد", "common.preparing": "در حال آمادهسازی…", "common.unavailable": "ناموجود",
  "common.free": "رایگان", "common.percent": "٪", "common.piece": "عدد", "common.itemUnit": "قلم",
  "common.actionFailed": "عملیات ممکن نشد.",
  "nav.categoriesMenu": "منوی دستهبندیها", "nav.categoriesPanel": "دستهبندی کالاها", "nav.closeMenu": "بستن منو",
  "nav.navigation": "ناوبری", "nav.mainNavigation": "ناوبری اصلی", "nav.searchProducts": "جستجوی کالا",
  "search.term": "عبارت جستجو", "search.placeholder": "جستجو…", "search.button": "جستجو", "search.suggestions": "پیشنهادها",
  "plp.noCategories": "دستهبندیای ثبت نشده است.", "plp.searchChip": "جستجو: ", "plp.priceChip": "قیمت: ",
  "plp.usd": "دلار", "plp.inStockChip": "موجود", "plp.onSaleChip": "تخفیفدار", "plp.rate": "نرخ: ",
  "spec.ram": "رم", "spec.storage": "حافظه", "spec.screen": "صفحه", "spec.display": "صفحه نمایش",
  "spec.battery": "باتری", "spec.cpu": "پردازنده", "spec.gpu": "پردازندهٔ گرافیکی", "spec.camera": "دوربین",
  "spec.front_camera": "دوربین سلفی", "spec.os": "سیستم عامل", "spec.weight": "وزن", "spec.thickness": "ضخامت",
  "spec.body": "جنس بدنه", "spec.color": "رنگ",
  "checkout.codeSentPrefix": "کد پیامکی به شمارهٔ ", "checkout.codeSentSuffix": " ارسال شد.", "checkout.getCode": "دریافت کد",
  "checkout.resendPrefix": "ارسال مجدد تا ", "checkout.resendSuffix": " ثانیه", "checkout.loginTitle": "ورود به حساب",
  "checkout.deliveryAddress": "نشانی تحویل", "checkout.newAddress": "نشانی جدید", "checkout.saveContinue": "ذخیره و ادامه",
  "checkout.continuePayment": "ادامه به پرداخت", "checkout.reviewPay": "بازبینی و پرداخت",
  "checkout.couponOptional": "کد تخفیف (اختیاری)", "checkout.placeAndPay": "ثبت سفارش و پرداخت",
  "checkout.otpFailed": "ارسال کد ممکن نشد.", "checkout.signedIn": "با موفقیت وارد شدید.", "checkout.invalidCode": "کد نامعتبر است.",
  "checkout.addressesFailed": "دریافت نشانیها ممکن نشد.", "checkout.addressSaveFailed": "ذخیرهٔ نشانی ممکن نشد.",
  "checkout.shippingFailed": "دریافت روشهای ارسال ممکن نشد.", "checkout.invalidCoupon": "کوپن معتبر نیست.",
  "checkout.orderFailed": "ثبت سفارش ممکن نشد.", "checkout.payFailed": "شروع پرداخت ممکن نشد.",
  "order.shipping": "ارسال", "order.tax": "مالیات", "order.payable": "قابل پرداخت", "order.summary": "خلاصهٔ پرداخت",
  "order.itemsTitle": "اقلام سفارش", "order.cancelled": "سفارش لغو شد.", "order.cancelFailed": "لغو ممکن نشد.",
  "order.payFailed": "پرداخت ممکن نشد.", "order.notFoundTitle": "سفارش پیدا نشد",
  "order.notFoundDesc": "ممکن است وارد نشده باشید یا شمارهٔ سفارش اشتباه باشد.",
  "wishlist.loginToSave": "برای ذخیره وارد شوید", "wishlist.saved": "در علاقهمندیها ✓",
  "wishlist.added": "به علاقهمندیها اضافه شد.", "wishlist.removed": "از علاقهمندیها حذف شد.",
  "review.loginRequired": "برای ثبت نظر باید وارد شوید.", "review.submitted": "نظر شما ثبت شد و پس از تأیید نمایش داده میشود.",
  "review.failed": "ثبت نظر ممکن نشد.", "review.titleOptional": "عنوان (اختیاری)",
  "review.bodyPlaceholder": "تجربهٔ خود را با این کالا به اشتراک بگذارید",
  "compare.added": "به مقایسه اضافه شد.", "compare.removed": "از مقایسه حذف شد.",
  "compare.addPrefix": "افزودن ", "compare.addSuffix": " به مقایسه", "compare.removePrefix": "حذف ",
  "compare.removeSuffix": " از مقایسه", "compare.emptyTitle": "محصولی برای مقایسه نیست",
  "compare.emptyDesc": "از فهرست کالاها، محصولات مورد نظر را به مقایسه اضافه کنید.",
  "compare.priceLabel": "قیمت (تومان)",
  "pdp.addCartPrefix": "افزودن ", "pdp.addCartSuffix": " به سبد", "pdp.generalSpecs": "مشخصات کلی",
  "pdp.noHistoryItem": "تاریخچهای برای این کالا ثبت نشده است.", "pdp.approvedReviews": "نظر تأییدشده",
  "pdp.noVerifiedReviews": "هنوز نظر تأییدشدهای ثبت نشده است.", "pdp.ratingDistribution": "توزیع امتیازها",
  "pdp.reviewFallback": "نظر خریدار", "pdp.buyer": "خریدار", "pdp.allCategory": "همهٔ این دسته ←",
  "pdp.productInfo": "اطلاعات محصول", "pdp.moreInfo": "اطلاعات تکمیلی محصول",
  "pdp.variantSelect": "انتخاب واریانت", "pdp.variantStockPrefix": "واریانت ", "pdp.variantStockSuffix": " عدد در انبار",
  "pdp.contactPrice": "تماس بگیرید",
  "home.benefits": "مزایای خرید", "home.trustTitle": "شفافیت قابل اندازهگیری",
  "home.priceTrack": "قیمت را ردیابی کنید", "home.voiceTitle": "آنچه خریداران میگویند",
  "account.notLoggedIn": "وارد نشدهاید", "account.loginDesc": "برای دیدن سفارشها و نشانیها، ابتدا وارد حساب خود شوید.",
  "account.cartItems": "کالاهای در سبد", "account.noOrdersTitle": "سفارشی ثبت نکردهاید",
  "account.noWishlistTitle": "علاقهمندیدهای ندارید",
  "address.postalCode": "کد پستی", "address.makeDefault": "پیشفرض کردن",
  "address.defaultChanged": "نشانی پیشفرض تغییر کرد.", "address.saved": "نشانی ذخیره شد.",
  "auth.passwordMismatch": "دو بار رمز یکسان وارد کنید.", "auth.passwordSaved": "رمز عبور با هش امن ذخیره شد.",
  "auth.passwordNote": "ورود اصلی با کد پیامکی است؛ رمز عبور اختیاری است و هرگز بهصورت متن خام ذخیره نمیشود.",
  "auth.forgotQuestion": "رمزتان را فراموش کردید؟", "auth.getResetLink": "لینک بازنشانی بگیرید",
  "auth.accountLabel": "حساب: ", "auth.resetTitle": "بازنشانی رمز عبور",
  "auth.resetLinkNote": "لینک بازنشانی تنها ۱۵ دقیقه معتبر است و تنها یکبار قابل استفاده است.",
  "auth.resetSentDesc": "اگر شمارهٔ واردشده ثبت شده باشد، لینک بازنشانی پیامک میشود.",
  "auth.sendResetLink": "ارسال لینک بازنشانی", "auth.sendFailed": "ارسال لینک ممکن نشد.",
  "auth.incompleteLink": "لینک بازنشانی ناقص است.", "auth.invalidLink": "لینک نامعتبر یا منقضی است.",
  "auth.resetDone": "رمز عبور شما هش و ذخیره شد. در حال بازگشت به حساب…",
  "auth.setNewPassword": "تنظیم رمز جدید", "auth.passwordRules": "رمز باید حداقل ۱۰ کاراکتر و ترکیبی از حرف و عدد باشد.",
  "auth.newLinkRequest": "درخواست لینک تازه ←",
  "returns.windowNote": "مدت اعتبار درخواست مرجوعی ۷ روز از تاریخ سفارش است و هر قلم تنها یکبار قابل درخواست است.",
  "returns.created": "درخواست مرجوعی ثبت شد.", "returns.createFailed": "ثبت درخواست ممکن نشد.",
  "returns.emptyMine": "درخواست مرجوعیای ثبت نکردهاید.", "returns.deliveredOnly": "فقط سفارشهای تحویلشده قابل مرجوعیاند.",
  "returns.reasonPlaceholder": "مثلاً: کالا با مشخصات ثبتشده مطابقت ندارد", "returns.submit": "ثبت درخواست",
  "notifications.loadError": "بارگذاری اعلانها ممکن نشد.",
  "design.breadcrumb": "زبان طراحی", "design.desc": "کاغذ گرم، خطهای مویی، گوشههای ۲ پیکسلی، بدون blur و gradient. قیمت = قرمز سیگنال، دکمهٔ اصلی = سبز برند.",
  "design.back": "بازگشت به فروشگاه ←", "design.colors": "رنگها", "design.typography": "تایپوگرافی",
  "design.typeSize": "اندازهٔ ", "design.typeExample": "تکنولوژی اصیل، قیمتی شفاف",
  "design.fonts": "فونت فارسی Vazirmatn و لاتین IBM Plex Sans/Mono بهصورت self-hosted بارگذاری میشوند.",
  "design.buttons": "دکمهها و نشانها", "design.primary": "اصلی", "design.secondary": "ثانویه",
  "design.ghost": "شفاف", "design.danger": "خطر", "design.buttonLink": "پیوند دکمه",
  "design.inStock": "موجود", "design.approximate": "تقریبی", "design.outOfStock": "ناموجود",
  "design.forms": "فرمها", "design.name": "نام", "design.nameHint": "همانطور که روی کارت است",
  "design.buyerName": "نام خریدار", "design.invalidCode": "کد معتبر نیست", "design.inStockOnly": "فقط کالاهای موجود",
  "design.feedback": "بازخورد و وضعیت", "design.infoTitle": "اطلاع", "design.infoBody": "قیمت هر هفته بازبینی میشود.",
  "design.warningTitle": "توجه", "design.warningBody": "قیمت تقریبی است.", "design.emptyTitle": "کالایی یافت نشد",
  "design.emptyDesc": "فیلترها را تغییر دهید.", "design.nav": "ناوبری و محتوا",
  "design.sample": "نمونه", "design.specsTab": "مشخصات", "design.specsContent": "جدول مشخصات استانداردشده",
  "design.reviewsTab": "نظرها", "design.reviewsContent": "نظر خریداران تأییدشده",
  "pwa.offline": "اتصال قطع شد. آخرین صفحههای دیدشده در دسترساند.", "pwa.installQuestion": "نصب فروشگاه روی دستگاه؟",
  "pwa.install": "نصب", "pwa.updateReady": "نسخهٔ تازهای آماده است.", "pwa.update": "بروزرسانی",
  "theme.prefix": "تم: ", "theme.light": "کاغذ گرم", "theme.dark": "شب مخملی", "theme.system": "سیستم",
  "gallery.noImagePrefix": "تصویر ", "gallery.noImageSuffix": " موجود نیست",
  "gallery.images": "تصاویر محصول", "gallery.showImage": "نمایش تصویر ",
  "meta.productMissing": "کالا پیدا نشد", "meta.specPricePrefix": "مشخصات و قیمت ",
  "meta.cart": "سبد خرید", "meta.cartDesc": "سبد خرید شما با قیمت شفاف و مقایسهٔ کالاها.",
  "meta.checkout": "تکمیل خرید", "meta.checkoutDesc": "مراحل ورود، نشانی، ارسال و پرداخت امن.",
  "meta.compare": "مقایسهٔ محصولات", "meta.compareDesc": "مقایسهٔ ردیفبهردیف مشخصات و قیمت کالاها.",
  "meta.account": "حساب من", "meta.accountDesc": "مدیریت سفارشها، نشانیها و علاقهمندیها.",
  "meta.orders": "سفارشها", "meta.ordersDesc": "تاریخچه و پیگیری سفارشهای ثبتشده.",
  "meta.orderTrack": "پیگیری سفارش", "meta.orderTrackDesc": "وضعیت و جزئیات سفارش ثبتشده.",
  "meta.productsDesc": "فهرست کالاها با فیلتر، فاست و مرتبسازی.",
  "meta.design": "زبان طراحی", "meta.designDesc": "توکنها، کامپوننتها و قواعد بصری فروشگاه.",
  "meta.forgot": "بازنشانی رمز عبور", "meta.forgotDesc": "درخواست لینک زماندار بازنشانی رمز عبور.",
  "meta.passwordReset": "تنظیم رمز جدید", "meta.passwordResetDesc": "تنظیم رمز عبور جدید با لینک بازنشانی.",
  "meta.notFound": "صفحه پیدا نشد",
  "meta.siteDescription": "فروشگاه الکترونیک با قیمت بهروز، مشخصات استاندارد و مقایسهٔ واقعی کالاها.",
  "locale.toFa": "تغییر زبان به فارسی", "locale.toEn": "تغییر زبان به انگلیسی", "locale.current": "زبان: ",
  "checkout.discountAppliedPrefix": "تخفیف ", "checkout.discountAppliedSuffix": " اعمال شد.",
  "common.breadcrumb": "مسیر صفحه", "ui.pagination": "صفحهبندی",
  "ui.steps": "مراحل خرید",
  "ui.pagePrev": "صفحهٔ قبل", "ui.pageNext": "صفحهٔ بعد",
  "category.mobile": "گوشی موبایل", "category.phone": "گوشی", "category.laptop": "لپتاپ",
  "category.gamingLaptop": "لپتاپ گیمینگ", "category.console": "کنسول بازی", "category.satellite": "ماهواره",
};

const en: Dict = {
  "nav.home": "Home", "nav.products": "Products", "nav.search": "Search", "nav.cart": "Cart",
  "nav.account": "Account", "nav.compare": "Compare", "nav.categories": "Categories", "nav.menu": "Open menu",
  "nav.signIn": "Sign in / Sign up",
  "login.title": "Sign in or create an account",
  "login.subtitle": "Enter your mobile number; a verification code arrives in seconds.",
  "login.phone": "Mobile number",
  "login.getCode": "Send verification code",
  "login.codeSent": "A verification code was sent to",
  "login.verify": "Verify & sign in",
  "login.resend": "Resend code",
  "login.success": "You are signed in",
  "login.forgot": "Forgot password?",
  "login.hint": "New here? Your account is created with this number on first sign-in.",
  "login.invalidPhone": "Enter a valid mobile number",
  "login.error": "Sign-in failed. Please try again.",
  "brand.home": "Digital Shopping — Home",
  "hero.eyebrow": "Electronics store", "hero.titleA": "Genuine Tech. Transparent Prices.",
  "hero.titleB": "Real prices, real comparison",
  "hero.descA": "Phones, laptops and electronics with fresh prices and honest comparison. Every listing is reviewed for price, photo and specs before publication.",
  "hero.descB": "No more guessing between marketing copy and real specs. Price, review date and standardized specs on one page.",
  "hero.cta": "Browse products", "hero.proof": "Why Digital Shopping?",
  "trust.authenticity": "Genuine products", "trust.shipping": "Transparent shipping", "trust.fresh": "Fresh prices", "trust.compare": "Honest comparison",
  "home.categories": "Where to start?", "home.allCategories": "All categories →", "home.new": "New arrivals",
  "home.deals": "On sale", "home.popular": "Most popular", "home.all": "View all →",
  "home.editorial": "Our approach", "home.editorialTitle": "Specification sheet, not advertising",
  "home.steps": "How it works", "home.stepsTitle": "Three steps to a confident purchase",
  "home.stats": "By the numbers", "home.price": "Price history", "home.voice": "Customer voice",
  "home.faq": "Guide", "home.faqTitle": "Frequently asked questions", "home.startCompare": "Start comparing",
  "plp.title": "All products", "plp.search": "Search results", "plp.filters": "Filters",
  "plp.showPrefix": "Show", "plp.showSuffix": "products", "plp.sort": "Sort",
  "plp.found": "products found", "plp.empty": "No products matched your filters.", "plp.clear": "Clear filters",
  "plp.category": "Category", "plp.brand": "Brand", "plp.ram": "RAM", "plp.storage": "Storage", "plp.priceRange": "Price range",
  "plp.inStock": "In stock only", "plp.onSale": "On sale", "plp.gig": "GB",
  "plp.minPrice": "Min price (USD)", "plp.maxPrice": "Max price (USD)", "plp.applyPrice": "Apply range", "plp.minRating": "Minimum rating", "plp.purchasable": "Purchasable only", "plp.ratingUp": "and up",
  "sort.newest": "Newest", "sort.priceAsc": "Price: low to high", "sort.priceDesc": "Price: high to low",
  "sort.rating": "Top rated", "sort.discount": "Biggest discount", "sort.popular": "Most popular",
  "pdp.specs": "Specifications", "pdp.history": "Price history", "pdp.reviews": "Customer reviews",
  "pdp.priceLabel": "Final price", "pdp.highlights": "Key specs",
  "pdp.related": "Similar products", "pdp.add": "Add to cart", "pdp.compare": "Compare", "pdp.wish": "Wishlist",
  "pdp.reviewForm": "Write your review", "pdp.verified": "Verified purchase", "pdp.noHistory": "No price history recorded yet.",
  "cart.title": "Shopping cart", "cart.empty": "Your cart is empty", "cart.checkout": "Checkout", "cart.remove": "Remove",
  "cart.loading": "Loading cart…", "cart.emptyDesc": "Add something you like to your cart.", "cart.items": "Items",
  "cart.unknownPrice": "Price unavailable", "cart.summary": "Order summary", "cart.qty": "Items", "cart.subtotal": "Subtotal",
  "cart.shippingNote": "Shipping and tax are calculated at the next step.", "cart.continue": "Continue to checkout",
  "cart.priceChanged": "The price of this item has changed since your last visit.", "cart.outOfStock": "This item is out of stock.", "cart.stockLow": "Only {n} left in stock.",
  "cart.blackFriday": "Black Friday · Special deal", "cart.each": "per item", "cart.lineTotal": "Line total",
  "checkout.title": "Checkout", "checkout.coupon": "Coupon code", "checkout.apply": "Apply", "checkout.pay": "Pay",
  "account.title": "My account", "account.overview": "Overview", "account.orders": "Orders", "account.addresses": "Addresses",
  "account.wishlist": "Wishlist", "account.password": "Password", "account.returns": "Returns", "account.notifications": "Notifications",
  "returns.title": "Returns", "returns.request": "Request return", "returns.new": "New request", "returns.reason": "Reason",
  "returns.requested": "Under review", "returns.approved": "Approved", "returns.rejected": "Rejected", "returns.refunded": "Refunded",
  "notifications.title": "Notifications", "notifications.unread": "unread", "notifications.read": "Mark as read",
  "notifications.readAll": "Mark all as read", "notifications.empty": "No notifications yet.",
  "footer.about": "About", "footer.help": "Help", "footer.legal": "Legal", "footer.rights": "All prices shown in IRR (Toman).",
  "footer.shop": "Shop", "footer.buy": "Purchase", "footer.trust": "Peace of mind",
  "footer.allProducts": "All products", "footer.newest": "New arrivals", "footer.compareProducts": "Compare products",
  "footer.cart": "Shopping cart", "footer.track": "Track order", "footer.addresses": "Addresses",
  "footer.guarantee": "Authenticity guarantee", "footer.return7": "7-day returns", "footer.secure": "Secure payment",
  "footer.freshPrices": "Fresh prices", "footer.exactSpecs": "Exact specifications", "footer.privacy": "Privacy",
  "hero.trust1": "Authenticity guarantee", "hero.trust2": "7-day returns", "hero.trust3": "Fresh prices", "hero.trust4": "Secure payment",
  "home.coverPhone": "iPhone", "home.coverGalaxy": "Samsung", "home.coverLaptop": "Laptop",
  "home.coverView": "Featured products", "home.navProducts": "Products", "home.navDeals": "Deals",
  "home.navCompare": "Compare", "home.navAccount": "Account", "home.navDesign": "Design language",
  "trust.authenticityD": "Every listing is reviewed before publication.", "trust.shippingD": "Cost and delivery time are shown before payment.",
  "trust.freshD": "The last price review date is displayed.", "trust.compareD": "Compare up to four products side by side.",
  "home.new.desc": "The latest listings reviewed and published.", "home.deals.desc": "Discounts are based on recorded reference prices, not arbitrary numbers.",
  "home.quote": "Standardized specs, verifiable prices and a review date. Three things to know before you buy.",
  "home.designLink": "See our design language →", "home.step1": "Filter", "home.step1d": "Choose brand, RAM, storage and price range.",
  "home.step2": "Compare", "home.step2d": "Compare up to four products side by side.", "home.step3": "Order",
  "home.step3d": "Secure payment, order tracking and transparent shipping.", "home.stat1": "Products compared at once",
  "home.stat2": "Seconds to refresh lists and facets", "home.stat3": "Days return window", "home.stat4": "UI languages (Persian and English)",
  "home.priceNote": "Prices are shown in IRR based on the recorded rate; “approximate” means not yet finally reviewed.",
  "home.voiceQuote": "For the first time I understood which phone was actually worth buying without opening ten tabs.",
  "home.faq1q": "Are prices up to date?", "home.faq1a": "The last review date of each listing is shown on its product page.",
  "home.faq2q": "How do I compare products?", "home.faq2a": "Use the compare button on a product card and select up to four items.",
  "home.faq3q": "How is shipping calculated?", "home.faq3a": "Shipping depends on the province and cart total after discounts, shown at checkout.",
  "home.faq4q": "Where do I enter a coupon?", "home.faq4a": "At the payment step of checkout; discounts are applied before tax.",
  "قیمت قبلی:": "Previous price:", "common.skip": "Skip to content", "plp.searchFor": "Results for",
  "common.retry": "Try again", "common.backHome": "Back to home", "common.notFound": "Page not found",
  "common.notFoundDesc": "The address does not exist or has been removed.", "common.errorTitle": "Something went wrong",
  "common.errorDesc": "The page could not be loaded. Please try again.", "common.loading": "Loading…",
  "account.hello": "Hello", "account.guest": "Guest", "account.logout": "Log out", "account.cartCount": "items in cart",
  "account.subtotal": "Cart subtotal", "account.viewOrders": "View orders", "account.noOrders": "No orders yet.",
  "account.noAddresses": "No addresses saved.", "account.addAddress": "Add address", "account.editAddress": "Edit address",
  "account.setDefault": "Default", "account.noWishlist": "Your wishlist is empty.", "account.passwordTitle": "Set password",
  "account.currentPassword": "Current password", "account.newPassword": "New password", "account.repeatPassword": "Repeat password",
  "account.changePassword": "Change password", "account.invalidCurrent": "Current password is invalid.", "account.weak": "Password does not meet security requirements.",
  "checkout.login": "Sign in", "checkout.phone": "Phone number", "checkout.code": "Verification code", "checkout.verify": "Verify & sign in",
  "checkout.address": "Address", "checkout.shipping": "Shipping method", "checkout.payment": "Payment", "checkout.orderSummary": "Order summary",
  "checkout.placeOrder": "Place order", "checkout.payNow": "Pay now", "checkout.success": "Order placed",
  "checkout.successDesc": "Your order was created successfully.", "checkout.track": "Track order", "checkout.discount": "Discount",
  "review.title": "Review title", "review.body": "Your review", "review.submit": "Submit review", "review.rating": "Rating",
  "order.status": "Status", "order.number": "Order number", "order.date": "Order date", "order.items": "Items",
  "order.total": "Total", "order.tracking": "Tracking number", "order.pay": "Pay", "order.cancel": "Cancel order",
  "order.expired": "Payment window expired", "wishlist.add": "Add to wishlist", "wishlist.remove": "Remove from wishlist",
  "compare.empty": "No products selected for comparison.", "compare.onlyDiff": "Only differences", "compare.remove": "Remove from compare",
  "products.title": "Products", "pdp.guarantee": "Authenticity guarantee", "pdp.return7": "7-day returns", "pdp.fastShip": "Fast shipping",
  "common.error": "Something went wrong. Try again.", "common.cancel": "Cancel",
  "common.save": "Save", "common.home": "Home", "common.product": "Products",
  "common.close": "Close", "common.continue": "Continue", "common.errorShort": "Error", "common.done": "Done",
  "common.sent": "Sent", "common.preparing": "Preparing…", "common.unavailable": "Unavailable",
  "common.free": "Free", "common.percent": "%", "common.piece": "pcs", "common.itemUnit": "items",
  "common.actionFailed": "The operation could not be completed.",
  "nav.categoriesMenu": "Category menu", "nav.categoriesPanel": "Product categories", "nav.closeMenu": "Close menu",
  "nav.navigation": "Navigation", "nav.mainNavigation": "Main navigation", "nav.searchProducts": "Search products",
  "search.term": "Search term", "search.placeholder": "Search…", "search.button": "Search", "search.suggestions": "Suggestions",
  "plp.noCategories": "No categories found.", "plp.searchChip": "Search: ", "plp.priceChip": "Price: ",
  "plp.usd": "USD", "plp.inStockChip": "In stock", "plp.onSaleChip": "On sale", "plp.rate": "Rate: ",
  "spec.ram": "RAM", "spec.storage": "Storage", "spec.screen": "Screen", "spec.display": "Display",
  "spec.battery": "Battery", "spec.cpu": "Processor", "spec.gpu": "Graphics processor", "spec.camera": "Camera",
  "spec.front_camera": "Front camera", "spec.os": "Operating system", "spec.weight": "Weight", "spec.thickness": "Thickness",
  "spec.body": "Body material", "spec.color": "Color",
  "checkout.codeSentPrefix": "A verification code was sent to ", "checkout.codeSentSuffix": ".",
  "checkout.getCode": "Get code", "checkout.resendPrefix": "Resend in ", "checkout.resendSuffix": " seconds",
  "checkout.loginTitle": "Sign in", "checkout.deliveryAddress": "Delivery address", "checkout.newAddress": "New address",
  "checkout.saveContinue": "Save and continue", "checkout.continuePayment": "Continue to payment",
  "checkout.reviewPay": "Review and pay", "checkout.couponOptional": "Coupon code (optional)",
  "checkout.placeAndPay": "Place order and pay", "checkout.otpFailed": "Could not send the code.",
  "checkout.signedIn": "Signed in successfully.", "checkout.invalidCode": "Invalid code.",
  "checkout.addressesFailed": "Could not load addresses.", "checkout.addressSaveFailed": "Could not save the address.",
  "checkout.shippingFailed": "Could not load shipping methods.", "checkout.invalidCoupon": "Invalid coupon.",
  "checkout.orderFailed": "Could not place the order.", "checkout.payFailed": "Could not start the payment.",
  "order.shipping": "Shipping", "order.tax": "Tax", "order.payable": "Amount due", "order.summary": "Payment summary",
  "order.itemsTitle": "Order items", "order.cancelled": "Order cancelled.", "order.cancelFailed": "Could not cancel the order.",
  "order.payFailed": "Could not process the payment.", "order.notFoundTitle": "Order not found",
  "order.notFoundDesc": "You may not be signed in, or the order number is incorrect.",
  "wishlist.loginToSave": "Sign in to save", "wishlist.saved": "In wishlist ✓",
  "wishlist.added": "Added to wishlist.", "wishlist.removed": "Removed from wishlist.",
  "review.loginRequired": "Sign in to write a review.", "review.submitted": "Your review was submitted and will be shown after approval.",
  "review.failed": "Could not submit the review.", "review.titleOptional": "Title (optional)",
  "review.bodyPlaceholder": "Share your experience with this product",
  "compare.added": "Added to comparison.", "compare.removed": "Removed from comparison.",
  "compare.addPrefix": "Add ", "compare.addSuffix": " to comparison", "compare.removePrefix": "Remove ",
  "compare.removeSuffix": " from comparison", "compare.emptyTitle": "No products to compare",
  "compare.emptyDesc": "Add products from the catalog to compare them.", "compare.priceLabel": "Price (IRR)",
  "pdp.addCartPrefix": "Add ", "pdp.addCartSuffix": " to cart", "pdp.generalSpecs": "General specifications",
  "pdp.noHistoryItem": "No price history recorded for this product.", "pdp.approvedReviews": "verified reviews",
  "pdp.noVerifiedReviews": "No verified reviews yet.", "pdp.ratingDistribution": "Rating distribution",
  "pdp.reviewFallback": "Customer review", "pdp.buyer": "Buyer", "pdp.allCategory": "All in this category ←",
  "pdp.productInfo": "Product information", "pdp.moreInfo": "Additional product information",
  "pdp.variantSelect": "Choose a variant", "pdp.variantStockPrefix": "Variant ", "pdp.variantStockSuffix": " in stock",
  "pdp.contactPrice": "Contact us",
  "home.benefits": "Shopping benefits", "home.trustTitle": "Measurable transparency",
  "home.priceTrack": "Track the price", "home.voiceTitle": "What buyers say",
  "account.notLoggedIn": "You are not signed in", "account.loginDesc": "Sign in to see your orders and addresses.",
  "account.cartItems": "Items in cart", "account.noOrdersTitle": "No orders yet",
  "account.noWishlistTitle": "No wishlist items yet",
  "address.postalCode": "Postal code", "address.makeDefault": "Make default",
  "address.defaultChanged": "Default address updated.", "address.saved": "Address saved.",
  "auth.passwordMismatch": "Enter the same password twice.", "auth.passwordSaved": "Password stored with a secure hash.",
  "auth.passwordNote": "Sign-in is primarily via SMS code; a password is optional and is never stored in plain text.",
  "auth.forgotQuestion": "Forgot your password?", "auth.getResetLink": "Get a reset link",
  "auth.accountLabel": "Account: ", "auth.resetTitle": "Reset password",
  "auth.resetLinkNote": "The reset link is valid for 15 minutes and can be used once.",
  "auth.resetSentDesc": "If the number is registered, a reset link will be sent by SMS.",
  "auth.sendResetLink": "Send reset link", "auth.sendFailed": "Could not send the link.",
  "auth.incompleteLink": "The reset link is incomplete.", "auth.invalidLink": "The link is invalid or has expired.",
  "auth.resetDone": "Your password was hashed and stored. Returning to your account…",
  "auth.setNewPassword": "Set a new password", "auth.passwordRules": "The password must be at least 10 characters and include letters and numbers.",
  "auth.newLinkRequest": "Request a new link ←",
  "returns.windowNote": "Returns can be requested within 7 days of the order date, once per item.",
  "returns.created": "Return request submitted.", "returns.createFailed": "Could not submit the request.",
  "returns.emptyMine": "No return requests yet.", "returns.deliveredOnly": "Only delivered orders can be returned.",
  "returns.reasonPlaceholder": "For example: the item does not match the listed specs", "returns.submit": "Submit request",
  "notifications.loadError": "Could not load notifications.",
  "design.breadcrumb": "Design language", "design.desc": "Warm paper, hairline borders, 2px corners, no blur or gradients. Price = signal red, primary button = brand green.",
  "design.back": "Back to store ←", "design.colors": "Colors", "design.typography": "Typography",
  "design.typeSize": "Size ", "design.typeExample": "Genuine tech, transparent prices",
  "design.fonts": "Vazirmatn for Persian and IBM Plex Sans/Mono for Latin are self-hosted.",
  "design.buttons": "Buttons and badges", "design.primary": "Primary", "design.secondary": "Secondary",
  "design.ghost": "Ghost", "design.danger": "Danger", "design.buttonLink": "Button link",
  "design.inStock": "In stock", "design.approximate": "Approximate", "design.outOfStock": "Out of stock",
  "design.forms": "Forms", "design.name": "Name", "design.nameHint": "As printed on the card",
  "design.buyerName": "Buyer name", "design.invalidCode": "Invalid code", "design.inStockOnly": "In-stock items only",
  "design.feedback": "Feedback and status", "design.infoTitle": "Info", "design.infoBody": "Prices are reviewed every week.",
  "design.warningTitle": "Attention", "design.warningBody": "The price is approximate.", "design.emptyTitle": "No products found",
  "design.emptyDesc": "Change the filters.", "design.nav": "Navigation and content",
  "design.sample": "Sample", "design.specsTab": "Specs", "design.specsContent": "Standardized specification table",
  "design.reviewsTab": "Reviews", "design.reviewsContent": "Verified customer reviews",
  "pwa.offline": "You are offline. Previously viewed pages are available.", "pwa.installQuestion": "Install the store on your device?",
  "pwa.install": "Install", "pwa.updateReady": "A new version is ready.", "pwa.update": "Update",
  "theme.prefix": "Theme: ", "theme.light": "Warm paper", "theme.dark": "Velvet night", "theme.system": "System",
  "gallery.noImagePrefix": "Image ", "gallery.noImageSuffix": " is unavailable",
  "gallery.images": "Product images", "gallery.showImage": "Show image ",
  "meta.productMissing": "Product not found", "meta.specPricePrefix": "Specs and price of ",
  "meta.cart": "Shopping cart", "meta.cartDesc": "Your cart with transparent prices and product comparison.",
  "meta.checkout": "Checkout", "meta.checkoutDesc": "Sign in, address, shipping and secure payment steps.",
  "meta.compare": "Compare products", "meta.compareDesc": "Compare product specs and prices side by side.",
  "meta.account": "My account", "meta.accountDesc": "Manage orders, addresses and wishlist.",
  "meta.orders": "Orders", "meta.ordersDesc": "History and tracking of placed orders.",
  "meta.orderTrack": "Track order", "meta.orderTrackDesc": "Status and details of a placed order.",
  "meta.productsDesc": "Product listing with filters, facets and sorting.",
  "meta.design": "Design language", "meta.designDesc": "Tokens, components and visual rules of the store.",
  "meta.forgot": "Reset password", "meta.forgotDesc": "Request a time-limited password reset link.",
  "meta.passwordReset": "Set a new password", "meta.passwordResetDesc": "Set a new password using the reset link.",
  "meta.notFound": "Page not found",
  "meta.siteDescription": "Electronics store with fresh prices, standardized specs and honest product comparison.",
  "locale.toFa": "Switch language to Persian", "locale.toEn": "Switch language to English", "locale.current": "Language: ",
  "checkout.discountAppliedPrefix": "Discount ", "checkout.discountAppliedSuffix": " applied.",
  "common.breadcrumb": "Breadcrumb", "ui.pagination": "Pagination",
  "ui.steps": "Checkout steps",
  "ui.pagePrev": "Previous page", "ui.pageNext": "Next page",
  "category.mobile": "Mobile phones", "category.phone": "Phones", "category.laptop": "Laptops",
  "category.gamingLaptop": "Gaming laptops", "category.console": "Game consoles", "category.satellite": "Satellite kits",
};

const dictionaries: Record<Locale, Dict> = { fa, en };

export function t(key: string, locale: Locale = "fa"): string {
  return dictionaries[locale]?.[key] ?? dictionaries.fa[key] ?? key;
}

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return locale === "fa" ? "rtl" : "ltr";
}

/** کلیدهای موجود؛ برای تست کمبود ترجمه استفاده میشود. */
export function missingKeys(locale: Locale): string[] {
  return Object.keys(fa).filter((k) => !(k in dictionaries[locale]));
}

/** ترجمهٔ متن فارسی ثابت به انگلیسی (برای متنهایی که هنوز به t() متصل نشدهاند). */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

const enDate = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const faDateParts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC",
});

function latinDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = FA_DIGITS.indexOf(d);
    return i >= 0 ? String(i) : String(AR_DIGITS.indexOf(d));
  });
}

/** تبدیل تقریبی تاریخ شمسی به میلادی با استفاده از تقویم بومی Intl (بدون وابستگی خارجی). */
function jalaliToGregorian(jy: number, jm: number, jd: number): Date | null {
  if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let dayOfYear = jd - 1;
  for (let i = 0; i < jm - 1; i += 1) dayOfYear += monthDays[i]!;
  // ۱ فروردین ۱۴۰۰ = ۲۱ مارس ۲۰۲۱؛ نوروز گاهی ۲۰ مارس است، بنابراین ±۴ روز جستجو میشود.
  const guess = Date.UTC(jy + 621, 2, 21) + dayOfYear * 86_400_000;
  for (let delta = -4; delta <= 4; delta += 1) {
    const date = new Date(guess + delta * 86_400_000);
    let y = 0;
    let m = 0;
    let day = 0;
    for (const part of faDateParts.formatToParts(date)) {
      const value = Number(latinDigits(part.value));
      if (part.type === "year") y = value;
      else if (part.type === "month") m = value;
      else if (part.type === "day") day = value;
    }
    if (y === jy && m === jm && day === jd) return date;
  }
  return null;
}

function convertDates(text: string): string {
  let out = text.replace(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/g, (match, y: string, m: string, d: string) => {
    const date = jalaliToGregorian(Number(y), Number(m), Number(d));
    return date ? enDate.format(date) : match;
  });
  const monthPattern = PERSIAN_MONTHS.join("|");
  out = out.replace(new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4})`, "g"), (match, d: string, month: string, y: string) => {
    const date = jalaliToGregorian(Number(y), PERSIAN_MONTHS.indexOf(month as (typeof PERSIAN_MONTHS)[number]) + 1, Number(d));
    return date ? enDate.format(date) : match;
  });
  return out;
}

interface Pair { from: string; to: string }

/** طولانیترین عبارت اول، تطابق با مرز واژه و حذف کلیدهای کوتاه که ترکیبها را میشکنند. */
const translationPairs: Pair[] = Object.keys(fa)
  .map((key) => {
    const from = fa[key]!.trim();
    const to = (en[key] ?? from).trim();
    return { from, to };
  })
  .filter(({ from }) => from.length >= 3 && /[\p{L}]/u.test(from))
  .concat([
    { from: "تومان", to: "IRR" },
    { from: "تاریخ:", to: "Date:" },
    { from: "تاریخ", to: "Date" },
  ])
  .sort((a, b) => b.from.length - a.from.length);

const exactPairs = new Map(Object.keys(fa).map((key) => [fa[key]!.trim(), (en[key] ?? fa[key]!).trim()]));

const isWordChar = (ch: string | undefined): boolean => Boolean(ch && /[\p{L}\p{N}\p{M}]/u.test(ch));

function replaceWhole(text: string, pair: Pair): string {
  let out = text;
  let from = 0;
  while (from <= out.length - pair.from.length) {
    const i = out.indexOf(pair.from, from);
    if (i < 0) break;
    const before = i === 0 ? undefined : out[i - 1];
    const after = out[i + pair.from.length];
    if (!isWordChar(before) && !isWordChar(after)) {
      out = out.slice(0, i) + pair.to + out.slice(i + pair.from.length);
      from = i + pair.to.length;
    } else {
      from = i + 1;
    }
  }
  return out;
}

export function englishText(text: string): string {
  const trimmed = text.trim();
  const exact = exactPairs.get(trimmed);
  if (exact) return exact;
  let out = text;
  for (const pair of translationPairs) {
    if (out.includes(pair.from)) out = replaceWhole(out, pair);
  }
  // ارقام فارسی/عربی، علامت درصد و تاریخ شمسی در حالت انگلیسی به شکل بینالمللی نمایش داده میشوند.
  out = latinDigits(out).replaceAll("٪", "%").replaceAll("٬", ",").replaceAll("،", ",");
  return convertDates(out);
}
