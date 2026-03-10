import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so TEST_ANTHROPIC_API_KEY is available in tests
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: 0,
    },
  },
  webServer: {
    command: "STORAGE_MODE= npx next dev --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 60_000,
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
      name: "demo",
      testMatch: /demo.*\.spec\.ts/,
      use: {
        browserName: "chromium",
        headless: false,
        video: "on",
      },
    },
  ],
});
