import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // E2E_CHANNEL=chrome اجازه میدهد از Chrome نصبشدهٔ محلی استفاده شود (زمانی که دانلود Chromium ممکن نیست).
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined } }],
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: "http://127.0.0.1:4000/api/v1/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: `npx next start --port ${port}`,
      url: baseURL,
      env: { API_BASE_URL: "http://127.0.0.1:4000/api/v1" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
