import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so TEST_ANTHROPIC_API_KEY is available in tests
config({ path: ".env.local" });

const localBaseURL = "http://localhost:3001";
const cloudSmokeBaseURL = process.env.CLOUD_SMOKE_BASE_URL || localBaseURL;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const cloudSmokeExtraHeaders = vercelBypass
  ? { "x-vercel-protection-bypass": vercelBypass, "x-vercel-set-bypass-cookie": "true" }
  : undefined;

export default defineConfig({
  testDir: "./tests",
  timeout: process.env.CI ? 60_000 : 180_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/playwright-junit.xml" }]]
    : "list",
  use: {
    baseURL: localBaseURL,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      slowMo: 0,
    },
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "STORAGE_MODE= npx next dev --port 3001",
        url: localBaseURL,
        reuseExistingServer: true,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
      },
  projects: [
    {
      name: "functional",
      testMatch: /functional\.spec\.ts/,
      use: {
        browserName: "chromium",
        headless: true,
      },
    },
    {
      name: "voice-capture",
      testMatch: /voice-capture\.spec\.ts/,
      use: {
        browserName: "chromium",
        headless: true,
      },
    },
    {
      name: "cloud-smoke",
      testMatch: /cloud-smoke\.spec\.ts/,
      use: {
        browserName: "chromium",
        headless: true,
        baseURL: cloudSmokeBaseURL,
        extraHTTPHeaders: cloudSmokeExtraHeaders,
      },
    },
  ],
});
