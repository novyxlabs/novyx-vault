import { defineConfig } from "@playwright/test";

/**
 * Standalone Playwright config for the demo recording.
 * No webServer — expects you to run `npm run dev` yourself first.
 * No projects — just one spec, one browser, one video.
 */
export default defineConfig({
  testDir: "./scripts",
  testMatch: "record-demo.spec.ts",
  timeout: 300_000, // 5 minutes — the demo is slow on purpose
  use: {
    baseURL: process.env.DEMO_BASE_URL || "http://localhost:3000",
    viewport: { width: 1920, height: 1080 },
    video: {
      mode: "on",
      size: { width: 1920, height: 1080 },
    },
    launchOptions: {
      slowMo: 150,
    },
  },
  reporter: [["list"]],
  outputDir: "./output/test-results",
});
