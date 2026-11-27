# Privacy and demo terms / حریم خصوصی و شرایط دمو

## Current scope / وضعیت فعلی

The published repository is **documentation and source code for viewing only**. No public demo server with real OTP, payment or user accounts is currently operated by this project. The GitHub Pages site is a static visual hub and does not collect personal data.

مخزن منتشرشده صرفاً اسناد و کد قابل مشاهده است. در حال حاضر هیچ سرویس دموی عمومی با OTP، پرداخت یا حساب کاربری واقعی توسط این پروژه اداره نمیشود. سایت GitHub Pages کاملاً ایستا است و دادهٔ شخصی جمعآوری نمیکند.

## If a public demo is enabled later / در صورت راهاندازی دمو

A read-only demo (`DEMO_MODE=1`) must follow these rules:

1. Seed data only — never import real customer data.
2. OTP codes are shown on-screen in demo mode and never sent to a real phone number.
3. Payment uses `FakeGateway` only; no real card data is accepted or stored.
4. The demo banner states clearly that orders and prices are illustrative.
5. Hosting logs keep request IDs only, never phone numbers, addresses or card data.
6. This document and the repository licence remain linked from the demo footer.

دمو باید فقط از دادههای seed استفاده کند، OTP را روی صفحه نمایش دهد، از درگاه شبیهسازی شده استفاده کند، هیچ اطلاعات کارت/نشانی ذخیره نکند و هشدار دمو بودن را بهوضوح نمایش دهد.

## Third-party services / سرویسهای طرف سوم

GitHub, Codecov, GitHub Pages and OpenSSF Scorecard process repository metadata under their own terms. Analytics or Sentry, when configured by an operator, are the operator's responsibility and must be disclosed in the deployed instance.

## Contact / تماس

Privacy questions: [GitHub](https://github.com/MFCAtash).
