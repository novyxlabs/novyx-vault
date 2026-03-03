import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    video: "on",
    launchOptions: {
      slowMo: 0,
    },
  },
  projects: [
    {
      name: "demo",
      use: {
        browserName: "chromium",
        headless: false,
      },
    },
  ],
});
