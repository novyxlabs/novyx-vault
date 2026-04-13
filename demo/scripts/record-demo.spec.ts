/**
 * Demo recording script — drives the Vault UI through the key moments
 * while Playwright records video at 1080p.
 *
 * Run from repo root:
 *   npm run demo
 *
 * Output: demo/output/test-results/.../video.webm
 */

import { test, type Page, type Locator } from "@playwright/test";

// Timing helpers
const PAUSE_SHORT = 1500;
const PAUSE_READ = 3000;
const PAUSE_MOMENT = 4000;
const PAUSE_TRANSITION = 2000;

/** Safe click — scrolls into view, clicks, returns true. Returns false on failure. */
async function safeClick(target: Locator, timeout = 5000): Promise<boolean> {
  try {
    await target.scrollIntoViewIfNeeded({ timeout });
    await target.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

/** Click a sidebar text item by exact match, with scroll. */
async function clickText(page: Page, text: string): Promise<boolean> {
  return safeClick(page.locator(`text="${text}"`).first());
}

/** Click a sidebar button by title attribute. */
async function clickButton(page: Page, title: string): Promise<boolean> {
  return safeClick(page.locator(`button[title="${title}"]`).first());
}

test("Novyx Vault demo recording", async ({ page }) => {
  // =========================================================================
  // SCENE 1: The vault — show a lived-in second brain (~12s)
  // =========================================================================

  await page.goto("/");
  await page.waitForTimeout(PAUSE_READ);

  // Expand Projects folder, open a note
  await clickText(page, "Projects");
  await page.waitForTimeout(PAUSE_SHORT);
  await clickText(page, "Vault Roadmap");
  await page.waitForTimeout(PAUSE_READ);

  // Scroll the note
  const editorArea = page.locator("main").first();
  await editorArea.evaluate((el) => el.scrollTo({ top: 300, behavior: "smooth" })).catch(() => {});
  await page.waitForTimeout(PAUSE_READ);

  // =========================================================================
  // SCENE 2: Knowledge graph (~10s)
  // =========================================================================

  if (await clickButton(page, "Graph view")) {
    await page.waitForTimeout(PAUSE_MOMENT + PAUSE_SHORT);
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 3: Journal entry from weeks ago (~8s)
  // =========================================================================

  await clickText(page, "Journal");
  await page.waitForTimeout(PAUSE_SHORT);
  await clickText(page, "2026-04-01");
  await page.waitForTimeout(PAUSE_READ);

  // =========================================================================
  // SCENE 4: Memory dashboard — show what the AI knows (~15s)
  // =========================================================================

  if (await clickButton(page, "Memory dashboard")) {
    await page.waitForTimeout(PAUSE_MOMENT);

    // Click through memory tabs
    await safeClick(page.locator('button:has-text("Memories")').first());
    await page.waitForTimeout(PAUSE_READ);

    await safeClick(page.locator('button:has-text("Insights")').first());
    await page.waitForTimeout(PAUSE_READ);

    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 5: Usage & limits (~8s)
  // =========================================================================

  if (await clickButton(page, "Usage & limits")) {
    await page.waitForTimeout(PAUSE_MOMENT);
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 6: Audit trail — cryptographic chain (~8s)
  // =========================================================================

  if (await clickButton(page, "Audit trail")) {
    await page.waitForTimeout(PAUSE_MOMENT);
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 7: Rollback history (~8s)
  // =========================================================================

  if (await clickButton(page, "Rollback history")) {
    await page.waitForTimeout(PAUSE_MOMENT);
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(PAUSE_TRANSITION);

  // =========================================================================
  // SCENE 8: Research note — wiki-links (~20s)
  // =========================================================================

  await clickText(page, "Research");
  await page.waitForTimeout(PAUSE_SHORT);
  await clickText(page, "AI Agent Memory");
  await page.waitForTimeout(PAUSE_READ);

  await editorArea.evaluate((el) => el.scrollTo({ top: 200, behavior: "smooth" })).catch(() => {});
  await page.waitForTimeout(PAUSE_READ);

  await editorArea.evaluate((el) => el.scrollTo({ top: 500, behavior: "smooth" })).catch(() => {});
  await page.waitForTimeout(PAUSE_READ);

  // Follow a wiki-link
  await clickText(page, "Karpathy LLM Wiki");
  await page.waitForTimeout(PAUSE_READ);

  // =========================================================================
  // SCENE 9: End beat (~6s)
  // =========================================================================

  await clickText(page, "Vault Roadmap");
  await page.waitForTimeout(PAUSE_MOMENT + PAUSE_TRANSITION);
});
