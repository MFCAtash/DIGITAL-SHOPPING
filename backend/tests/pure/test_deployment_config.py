"""استاتیک: پیکربندی استقرار باید DEPLOY_DIR/GITHUB_SHA را بفرستد، backup بگیرد و rollback واقعی داشته باشد."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class DeploymentConfigTests(unittest.TestCase):
    def test_deploy_workflow_passes_vars_and_has_real_rollback(self):
        text = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
        self.assertIn("DEPLOY_DIR: ${{ vars.DEPLOY_DIR }}", text)
        self.assertIn("export DEPLOY_DIR=", text)
        self.assertIn("export GITHUB_SHA=", text)
        self.assertIn("git checkout --quiet \"\\$GITHUB_SHA\"", text)
        self.assertIn("pg_dump", text)
        self.assertIn("pre-migrate-", text)
        self.assertIn("manage.py migrate --noinput", text)
        self.assertIn("/api/v1/health", text)
        self.assertIn('"https://\\${SITE_HOST}/"', text)
        self.assertIn("if: failure()", text)
        self.assertIn("git checkout --quiet \"\\$PREVIOUS_SHA\"", text)
        self.assertIn("workflow_dispatch:", text)
        self.assertIn('tags: ["v*"]', text)

    def test_compose_migrates_once_and_secures_redis(self):
        text = (ROOT / "backend/docker-compose.yml").read_text(encoding="utf-8")
        self.assertIn('RUN_MIGRATIONS: "0"', text)
        self.assertIn("--requirepass", text)
        self.assertIn("redis://:${REDIS_PASSWORD}@redis:6379/0", text)
        self.assertIn("REDISCLI_AUTH", text)
        self.assertIn("sslmode=${POSTGRES_SSLMODE:-require}", text)
        self.assertIn("WORKER_HEARTBEAT_FILE", text)

    def test_env_example_documents_read_variables_without_real_secrets(self):
        text = (ROOT / "backend/.env.example").read_text(encoding="utf-8")
        for name in (
            "RUN_MIGRATIONS", "CATALOG_JSON", "CACHE_KEY_PREFIX", "SMS_HTTP_TIMEOUT",
            "SESSION_EXPIRE_AT_BROWSER_CLOSE", "RETURN_WINDOW_DAYS", "E2E_BASE_URL", "E2E_CHANNEL",
            "REDIS_PASSWORD", "PAYMENT_REFUND_URL", "SECURE_SSL_REDIRECT=True", "sslmode=require",
        ):
            self.assertIn(name, text)
        self.assertNotIn("SECURE_SSL_REDIRECT=False", text)

    def test_image_rights_register_covers_every_catalog_image(self):
        catalog = json.loads((ROOT / "overlay/data/real-catalog.json").read_text(encoding="utf-8"))
        rights = json.loads((ROOT / "overlay/data/image-rights.json").read_text(encoding="utf-8"))
        entries = {(e["product_slug"], e["file"]): e for e in rights["images"]}
        expected = {(p["slug"], im["file"]) for p in catalog["products"] for im in p.get("images", [])}
        self.assertEqual(set(entries), expected)
        for key, entry in entries.items():
            for field in ("file", "product_slug", "source", "license", "rights_status", "note"):
                self.assertTrue(entry.get(field), (key, field))
            if key[0] == "grand-theft-auto-vi":
                self.assertEqual(entry["license"], "user-provided")
                self.assertEqual(entry["source"], "user upload")
            else:
                self.assertEqual(entry["license"], "source-attribution")
                self.assertEqual(entry["rights_status"], "needs-review")


if __name__ == "__main__":
    unittest.main()
