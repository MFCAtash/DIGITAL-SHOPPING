# آمادهسازی و آپلود پروژه بر روی GitHub شخصی

این سند تمام مراحل لازم برای قرار دادن پروژه در یک مخزن شخصی GitHub را پوشش میدهد. مخزن محلی **از قبل آماده و کامیت اولیه زده شده است**؛ فقط مراحل مربوط به ریموت و تنظیمات حساب باقی است.

---

## ۱. وضعیت فعلی (انجامشده)

- مخزن Git با شاخهٔ `main` مقداردهی اولیه شد.
- `.gitignore` و `.gitattributes` تنظیم شدند； `node_modules`، `.next`، `.venv`، `.env`، دیتابیسهای محلی، کشها و خروجیهای تستIgnore میشوند.
- `.env.example`ها، `LICENSE`، `NOTICE`، `CODE_OF_CONDUCT.md`، `CONTRIBUTING.md`، `SECURITY.md` وهمه مستندات `docs/` اضافه شدند.
- الگوهای GitHub اضافه شدند:
  - `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/dependabot.yml`
  - `.github/workflows/{backend-ci,web-ci,ui-ci,security,deploy}.yml`
- اسکن رازها: **هیچ راز واقعی یافت نشد**； تنها مقادیر آزمایشی/CI (`change-me-*`) و فلگهای تست وجود دارند که در `.gitleaks.toml` مجازاند.
- تستها قبل از کامیت سبزاند: بکاند **۳۱۱**، UI **۵۴**، E2E **۴** + **۲۶** پیشنمایش，`ruff`/`tsc`/`next build` موفق.

---

## ۲. ساخت مخزن روی GitHub

1. وارد https://github.com/new شوید.
2. Repository name: مثلاً `digital-shopping` (همان نامی که در `_remote` استفاده میکنید).
3. **Private** یا **Public** — دلخواه； اگر Public است، مطمئن شوید هیچ رازی در کدها وجود ندارد (در پروژه ما وجود ندارد).
4. **تیک نزنید** گزینههای `Add a README`، `.gitignore` و `license` — ماهمه را محلاً داریم.
5. Create repository.

---

## ۳. اتصالریموت و آپلود

در پوشهٔ پروژه (همان جایی که `.git` قرار دارد):

```powershell
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

اگر مخزن از قبل محتوا داشت:

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

برای احراز هویت، از **Personal Access Token** با دسترسی `repo` استفاده کنید (GitHub پسورد حساب را برای Git قبول نمیکند):

```powershell
# هنگام درخواست اسم/پسورد، از توکن بهعنوان پسورد استفاده کنید
git config --global credential.helper manager
```

---

## ۴. تنظیم Secrets و Variables (برای CI/CD)

در مخزن: **Settings → Secrets and variables → Actions**

### Repository variables (غیر حساس)

| نام | مثال | توضیح |
|---|---|---|
| `DEPLOY_DIR` | `/srv/digital-shopping` | مسیر پوشه روی سرور |
| `SITE_HOST` | `shop.example.com` | دامنهٔ سایت |

### Repository secrets (حساس)

| نام | توضیح |
|---|---|
| `DEPLOY_SSH_KEY` | کلید خصوصی SSH سرور (بدون passphrase) |
| `DEPLOY_HOST` | آدرس IP یا hostname سرور |
| `DEPLOY_USER` | کاربر SSH |
| `SLACK_WEBHOOK_URL` | وب هوک هشدارها (اختیاری) |
| `EMAIL_TO` | گیرندهٔ ایمیل هشدارها (اختیاری) |
| `SENTRY_DSN` | DSN ثبت خطاها (اختیاری) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN سمت مرورگر (اختیاری) |

> **هرگز** `SECRET_KEY`، رمز دیتابیس یا توکن پرداخت واقعی را در GitHub Secrets قرار ندهید مگر اینکه مطمئن باشید workflowها از محیط production جدااند. مقادیر نمونه در `.env.example` قرار دارند.

### محیطها (Environments)

در **Settings → Environments** یک محیط `production` بسازید و در آن `Required reviewers` را فعال کنید تا deploy تنها پس از تأیید شما اجرا شود. `deploy.yml` روی `workflow_dispatch` و تگ `v*` اجرا میشود.

---

## ۵. بررسی عملکرد CI

پس از آپلود:

1. تب **Actions** را باز کنید — پنج workflow اجرا میشوند:
   - `backend-ci`: ruff، migratecheck، pytest با Postgres و coverage
   - `web-ci`: tsc، build، Playwright و Lighthouse
   - `ui-ci`: token/contrast/design/typecheck/unit/E2E
   - `security`: gitleaks، pip-audit، npm audit
   - `deploy`: فقط دستی یا تگ `v*`
2. اگر `gitleaks` در CI مقدارهای ثابت `backend-ci.yml` را فلگ کرد، فلگهای مربوطه در `.gitleaks.toml` اضافه شدهاند.
3. `web-ci` از mock API پورت ۴۰۰۰ هم در بیلد و هم در E2E/Lighthouse استفاده میکند.

---

## ۶. انتشار نسخه و Deploy

```powershell
git tag -a v2026.11.26 -m "Initial production-ready release"
git push origin main --tags
```

تگ `v*` workflow deploy را تحریک میکند. قبل از آن مطمئن شوید:

- `DEPLOY_DIR`، `DEPLOY_SSH_KEY`، `DEPLOY_HOST`، `DEPLOY_USER` تنظیم شدند.
-روی سرور `.env` بر اساس `backend/.env.example` ساخته و رازها پر شدند.
- دامنه و TLS توسط Caddy بهطور خودکار تنظیم میشود.

---

## ۷. محافظت از شاخهٔ main

**Settings → Branches → Add branch ruleset**:

- Require a pull request before merging (حداقل ۱ تأیید)
- Require status checks: `backend-ci`, `web-ci`, `ui-ci`, `security`
- Require conversation resolution
- Block force pushes و حذف شاخه

---

## ۸. عیبیابی رایج

| مشکل | راهحل |
|---|---|
| `fatal: remote origin already exists` | `git remote set-url origin <URL>` |
| `Permission denied (publickey)` | کلید SSH را به GitHub اضافه کنید یا از HTTPS+token استفاده کنید |
| CI گitleaks را فلگ کرد | `.gitleaks.toml` را بررسی کنید； فقط مقادیر آزمایشی مجازاند |
| E2E در CI خطا میدهد | مطمئن شوید mock API پورت ۴۰۰۰ قبل از Next اجرا میشود |
| Deployrollback نشد | فایل `.deploy-previous-sha` روی سرور را بررسی کنید |

---

## ۹. نکات نگهداری

- هر تغییر را همراه با ورودی تاریخگذاریشده در `docs/CHANGELOG.md` کامیت کنید.
- قبل از ادغام بزرگ، `docs/PROJECT-AUDIT-2026-FA.md` را بهروزرسانی کنید.
- تصاویر و فونتها در `docs/ASSET-PROVENANCE.md` مستنداند； ۴۹ عکس کاتالوگ وضعیت `needs-review` دارند و پیش از استفادهٔ تجاری نیاز به تأیید حقوقیاند.
