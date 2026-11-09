import { defineConfig, devices } from "@playwright/test";
import { browserOrigin, validateBrowserEnvironment } from "./tests/fixtures/wp02-browser-environment";

validateBrowserEnvironment(process.env);

export default defineConfig({
  testDir: "./tests/wp02-browser",
  outputDir: "test-results/wp02-attribution",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/wp02-attribution-report.json" }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: browserOrigin, trace: "retain-on-failure", serviceWorkers: "block" },
  webServer: {
    command: "node --import tsx tests/fixtures/wp02-browser-server.ts",
    url: `${browserOrigin}/api/health/live`,
    reuseExistingServer: false,
    timeout: 180_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
  },
  projects: [{ name: "wp02-attribution-chromium", use: { ...devices["Desktop Chrome"] } }],
});
