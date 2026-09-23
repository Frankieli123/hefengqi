import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: externalBaseURL ?? "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: externalBaseURL ? undefined : { command: "pnpm dev", url: "http://127.0.0.1:3000/api/health/live", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
