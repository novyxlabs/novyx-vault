import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: 0,
    },
  },
  webServer: {
    command: "STORAGE_MODE= npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
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
