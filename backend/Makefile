seed-shipping:
	docker compose run --rm api python manage.py seed_shipping_methods

.PHONY: seed-shipping up down logs migrate migrations migrations-check createsuperuser import-catalog set-rate data-report expire-orders test test-pure test-cov lint check lock

up:
	docker compose up -d --build
down:
	docker compose down
logs:
	docker compose logs -f api worker
# فقط یک بار (مرحلهٔ ۱.۲): ساخت مهاجرت‌های اولیه. سپس پوشه‌های migrations/ را commit کنید.
migrations:
	python manage.py makemigrations accounts core catalog pricing orders cart payments
migrations-check:
	python manage.py makemigrations --check --dry-run
migrate:
	docker compose run --rm api python manage.py migrate
createsuperuser:
	docker compose run --rm api python manage.py createsuperuser
import-catalog:
	docker compose run --rm api python manage.py import_catalog
# نمونه: make set-rate RATE=1050000
set-rate:
	docker compose run --rm api python manage.py set_exchange_rate $(RATE)
data-report:
	docker compose run --rm api python manage.py report_data_quality
expire-orders:
	docker compose run --rm api python manage.py expire_pending_orders
check:
	docker compose run --rm api python manage.py check --deploy
test-pure:
	python3 -m unittest discover -s tests/pure -t . -v
test:
	pytest -q
test-cov:
	pytest -q --cov --cov-report=term-missing --cov-fail-under=80
	coverage report --include="apps/orders/*,apps/pricing/*" --fail-under=90
lint:
	ruff check . && ruff format --check .
# قفل‌کردن نسخه‌ها (مرحلهٔ ۱.۳): constraints.txt را commit کنید؛ CI و Dockerfile خودکار از آن استفاده می‌کنند.
lock:
	pip-compile --strip-extras --output-file constraints.txt requirements-dev.txt
