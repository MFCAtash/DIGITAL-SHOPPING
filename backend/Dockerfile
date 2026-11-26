FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
# constraints.txt (خروجی `make lock`) اگر commit شده باشد، نسخه‌ها دقیقاً قفل می‌شوند؛ حرف آخر `[t]` یعنی «اگر وجود داشت»
COPY requirements.txt constraints.tx[t] ./
RUN if [ -f constraints.txt ]; then pip install --no-cache-dir -r requirements.txt -c constraints.txt; else pip install --no-cache-dir -r requirements.txt; fi
COPY . .
RUN chmod +x docker/entrypoint.sh && useradd -m app && chown -R app /app
USER app
# collectstatic فقط به تنظیمات نیاز دارد؛ مقدارهای ساختگی فقط در زمان build استفاده می‌شوند
RUN SECRET_KEY=build-only DATABASE_URL=sqlite:////tmp/build.db DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py collectstatic --noinput
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://127.0.0.1:8000/api/v1/health || exit 1
ENTRYPOINT ["docker/entrypoint.sh"]
# لاگ هر درخواست را RequestIdMiddleware به‌صورت JSON می‌نویسد؛ access-log متنی gunicorn تکراری و غیرساختاریافته است
CMD ["gunicorn", "config.wsgi:application", "-b", "0.0.0.0:8000", "-w", "3"]
