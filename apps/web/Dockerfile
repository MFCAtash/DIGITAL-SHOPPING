# ساخت از ریشهٔ مخزن: docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS deps
WORKDIR /app
COPY packages/ui/package.json packages/ui/package-lock.json packages/ui/
COPY apps/web/package.json apps/web/package-lock.json apps/web/
# npm در apps/web مرجع file:../../packages/ui را دارد؛ ساختار پوشه حفظ میشود.
# npm ci با lockfile کامیتشده نصب کاملاً بازتولیدپذیر را تضمین میکند.
RUN cd apps/web && npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# ساختار پوشهها باید همانند مرحلهٔ builder بماند تا پیوند @digital-shopping/ui (file:../../packages/ui) معتبر باشد.
# اجرا بهعنوان کاربر غیر root (کمترین امتیاز).
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --chown=nextjs:nodejs --from=builder /app/packages/ui ./packages/ui
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next ./apps/web/.next
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/public ./apps/web/public
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/package.json ./apps/web/package.json
WORKDIR /app/apps/web
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
