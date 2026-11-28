# Repository map / نقشۀ مخزن

This guide explains what each top-level directory is, which files are authoritative, and which are historical records.

این راهنما نقش هر پوشۀ اصلی و مرجع بودن فایلها را مشخص میکند.

| Path | Role | Authoritative? |
|---|---|---|
| `backend/` | Django 5.2 project: settings, apps, tests, management commands | ✅ source of truth for server behaviour |
| `contracts/openapi.json` | Generated API contract (39 paths) | ✅ source of truth for the HTTP contract |
| `apps/web/` | Next.js 16 frontend: routes, components, locale layer, fonts, E2E | ✅ source of truth for UI |
| `packages/ui/` | `@digital-shopping/ui` design system, tokens and component tests | ✅ source of truth for visual tokens |
| `overlay/data/` | Catalogue seed (`real-catalog.json`) and image-rights ledger | ✅ source of truth for seed data and rights |
| `ops/` | Docker Compose, Caddy, backup, k6 and monitoring configuration | ✅ source of truth for deployment |
| `scripts/` | Security scan, secret rotation, i18n audit and screenshot capture | ✅ tooling |
| `docs/` | ADRs, runbooks, audits, design concepts, poster/screenshot galleries, demo video and player | 📘 documentation |
| `docs/media/` | Optimised 1080p/720p demo video, animated preview, poster, chapter track and scrub-preview sprite used by the README and player | 🎬 media |
| `docs/internal/` | Historical working notes moved out of the repository root | 🗄️ archive — not product code |
| `docs/legacy-overlay/` | Earlier phase notes for the catalogue overlay | 🗄️ archive |
| `legacy/` | Pre-redesign assets retained for provenance | 🗄️ archive — do not use in production |

## Reading order for a new reviewer / ترتیب مطالعه

1. [`README.md`](../README.md) — English first, then Persian.
2. [`adr/README.md`](adr/README.md) — architectural decisions.
3. [`DESIGN-LANGUAGE.md`](DESIGN-LANGUAGE.md) and [`GALAXY-THEMES-FA.md`](GALAXY-THEMES-FA.md) — visual system.
4. [`RUNBOOK.md`](RUNBOOK.md) and [`SLO.md`](SLO.md) — operations and targets.
5. [`PROJECT-AUDIT-2026-FA.md`](PROJECT-AUDIT-2026-FA.md), [`IMAGE-RIGHTS.md`](IMAGE-RIGHTS.md) and [`SECURITY-AUDIT-REPORT-FA.md`](SECURITY-AUDIT-REPORT-FA.md) — known risks.
6. [`GITHUB-SETUP.md`](GITHUB-SETUP.md) — secrets, variables and branch protection.

## Conventions / قواعد

- Never edit generated artefacts (`contracts/openapi.json`, `.next/`, compiled tests) by hand.
- Never commit `.env`, real secrets or local SQLite databases.
- All runtime money calculations live in `backend/apps/pricing/`; the frontend only displays server results.
- All user-facing strings go through the fa/en dictionary in `apps/web/lib/i18n.ts`.
- Documentation in `docs/internal/` and `legacy/` is preserved for auditability, not maintained as product documentation.
