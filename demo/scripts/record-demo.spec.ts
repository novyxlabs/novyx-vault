/**
 * Demo recording script — drives the Vault UI through the key moments
 * while Playwright records video at 1080p.
 *
 * Run:
 *   NOVYX_MEMORY_API_KEY=your_key npm run dev &
 *   npx playwright test demo/scripts/record-demo.spec.ts --headed
 *
 * Output: demo/output/demo-recording.webm
 *
 * Post-production: add captions, music, intro/outro in iMovie or DaVinci Resolve.
 * Or use ffmpeg for basic caption overlays — see demo/scripts/add-captions.sh.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";

// Timing helpers — slow enough for humans to follow in a video
const PAUSE_SHORT = 1500; // between quick actions
const PAUSE_READ = 3000; // let the viewer read something
const PAUSE_MOMENT = 4000; // dramatic pause for "wow" moments
const PAUSE_TRANSITION = 2000; // between scenes

test.use({
  viewport: { width: 1920, height: 1080 },
  video: {
    mode: "on",
    size: { width: 1920, height: 1080 },
  },
  launchOptions: {
    slowMo: 150, // slight slowdown makes interactions look natural
  },
});

test("Novyx Vault demo recording", async ({ page }) => {
  // =========================================================================
  // SCENE 1: The vault — show a lived-in second brain
  // =========================================================================

  await page.goto(BASE_URL);
  await page.waitForTimeout(PAUSE_READ);

  // Expand the Projects folder to show notes
  const projectsFolder = page.locator("text=Projects").first();
  if (await projectsFolder.isVisible()) {
    await projectsFolder.click();
    await page.waitForTimeout(PAUSE_SHORT);
  }

  // Click on the Vault Roadmap note
  await page.locator("text=Vault Roadmap").first().click();
  await page.waitForTimeout(PAUSE_READ);

  // Scroll the note slowly to show the content
  const editor = page.locator('[class*="cm-editor"], [class*="editor"], main').first();
  if (await editor.isVisible()) {
    await editor.evaluate((el) => {
      el.scrollTo({ top: 300, behavior: "smooth" });
    });
    await page.waitForTimeout(PAUSE_READ);
  }

  // =========================================================================
  // SCENE 2: Open the knowledge graph — show connections
  // =========================================================================

  // Click the graph icon in the sidebar
  const graphButton = page.locator('[title*="graph" i], [title*="Graph" i], button:has(svg)').first();
  if (await graphButton.isVisible()) {
    await graphButton.click();
    await page.waitForTimeout(PAUSE_MOMENT);
  }

  // Close graph and transition
  await page.keyboard.press("Escape");
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 3: Memory persistence — the AI remembers across sessions
  // =========================================================================

  // Open a journal note from weeks ago
  const journalFolder = page.locator("text=Journal").first();
  if (await journalFolder.isVisible()) {
    await journalFolder.click();
    await page.waitForTimeout(PAUSE_SHORT);
  }

  await page.locator("text=2026-04-01").first().click();
  await page.waitForTimeout(PAUSE_READ);

  // Open the memory dashboard / Mission Control
  const controlButton = page.locator('[title*="Control" i], [title*="Mission" i]').first();
  if (await controlButton.isVisible()) {
    await controlButton.click();
    await page.waitForTimeout(PAUSE_MOMENT);
  }

  // Show the governance dashboard (stats, activity)
  await page.waitForTimeout(PAUSE_READ);

  // Close Mission Control
  await page.keyboard.press("Escape");
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 4: Memory rollback — undo what the AI learned
  // =========================================================================

  // Open the memory view
  const memoryButton = page.locator('[title*="memory" i], [title*="Memory" i], [title*="Usage" i]').first();
  if (await memoryButton.isVisible()) {
    await memoryButton.click();
    await page.waitForTimeout(PAUSE_MOMENT);
  }

  // Let the viewer see the memory list
  await page.waitForTimeout(PAUSE_READ);

  // Close memory view
  await page.keyboard.press("Escape");
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 5: Open a research note to show wiki-links and depth
  // =========================================================================

  // Navigate to Research folder
  const researchFolder = page.locator("text=Research").first();
  if (await researchFolder.isVisible()) {
    await researchFolder.click();
    await page.waitForTimeout(PAUSE_SHORT);
  }

  await page.locator("text=AI Agent Memory").first().click();
  await page.waitForTimeout(PAUSE_READ);

  // Scroll to show the full note
  if (await editor.isVisible()) {
    await editor.evaluate((el) => {
      el.scrollTo({ top: 200, behavior: "smooth" });
    });
    await page.waitForTimeout(PAUSE_READ);

    await editor.evaluate((el) => {
      el.scrollTo({ top: 500, behavior: "smooth" });
    });
    await page.waitForTimeout(PAUSE_READ);
  }

  // Click a wiki-link to show navigation
  const wikiLink = page.locator("text=Karpathy LLM Wiki").first();
  if (await wikiLink.isVisible()) {
    await wikiLink.click();
    await page.waitForTimeout(PAUSE_READ);
  }

  // =========================================================================
  // SCENE 6: Final beat — show the app is real and polished
  // =========================================================================

  // Back to the vault root
  await page.locator("text=Vault Roadmap").first().click();
  await page.waitForTimeout(PAUSE_MOMENT);

  // End on the vault with the sidebar visible
  await page.waitForTimeout(PAUSE_TRANSITION);
});
