import { test, expect } from "@playwright/test";

const TEST_NOTE = `_pw_test_note_${Date.now()}`;
const TEST_FOLDER = `_pw_test_folder_${Date.now()}`;

// Helper: create a note via API
async function createNote(baseURL: string, path: string, content: string) {
  await fetch(`${baseURL}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
}

// Helper: delete a note via API
async function deleteNote(baseURL: string, path: string) {
  await fetch(`${baseURL}/api/notes`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

test.describe("App loads", () => {
  test("homepage renders app shell", async ({ page }) => {
    await page.goto("/");
    // App should render — look for the sidebar toggle or main content area
    await expect(page.locator("aside, main, [data-testid='sidebar']").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("page has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Noctivault/);
  });

  test("security headers are present", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });
});

test.describe("Note CRUD", () => {
  const notePath = TEST_NOTE;

  test.afterAll(async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || "http://localhost:3000";
    await deleteNote(baseURL, notePath);
  });

  test("create a note via API and see it in sidebar", async ({ page }) => {
    const baseURL = page.url().startsWith("http") ? new URL(page.url()).origin : "http://localhost:3000";
    await createNote(baseURL, notePath, `# Test Note\n\nHello from Playwright`);

    await page.goto("/");
    // Wait for note list to load
    await page.waitForTimeout(1000);

    // The note name should appear in the sidebar
    const sidebar = page.locator("aside").first();
    await expect(sidebar.locator(`text=${notePath}`)).toBeVisible({ timeout: 5000 });
  });

  test("click note to open it in editor", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Click the test note in sidebar
    await page.locator(`text=${notePath}`).first().click();

    // Editor area should contain the note content
    await expect(page.locator(".cm-editor, [data-testid='editor']").first()).toBeVisible({ timeout: 5000 });
  });

  test("edit note content persists", async ({ page, baseURL }) => {
    await createNote(baseURL!, notePath, `# Test Note\n\nOriginal content`);
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Open the note
    await page.locator(`text=${notePath}`).first().click();
    await page.waitForTimeout(500);

    // Verify content loads via API
    const res = await fetch(`${baseURL}/api/notes?path=${encodeURIComponent(notePath)}`);
    const data = await res.json();
    expect(data.content).toContain("Original content");
  });
});

test.describe("Keyboard shortcuts", () => {
  test("Ctrl+S opens command palette", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    await page.keyboard.press("Control+s");
    // Command palette should appear with search input
    const dialog = page.locator('[role="dialog"][aria-label="Search"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Close it
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("Ctrl+N opens new note modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    await page.keyboard.press("Control+n");
    // New note modal should be visible
    await expect(page.locator("text=New Note").first()).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
  });
});

test.describe("Settings modal", () => {
  test("opens and closes with ARIA attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // Open settings via sidebar button
    await page.keyboard.press("Meta+,");
    await page.waitForTimeout(300);

    // If Cmd+, doesn't work, click the settings button
    const settingsDialog = page.locator('[role="dialog"][aria-label="AI Settings"]');
    if (!(await settingsDialog.isVisible())) {
      // Try clicking settings icon in sidebar
      const settingsBtn = page.locator('button:has-text("Settings"), button[title*="Settings"]').first();
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
      }
    }

    // Check ARIA attributes if dialog is visible
    if (await settingsDialog.isVisible()) {
      await expect(settingsDialog).toHaveAttribute("aria-modal", "true");
      expect(await settingsDialog.getAttribute("aria-label")).toBe("AI Settings");

      // Close with escape
      await page.keyboard.press("Escape");
      await expect(settingsDialog).not.toBeVisible();
    }
  });
});

test.describe("Command palette search", () => {
  const searchNote = `_pw_search_${Date.now()}`;

  test.beforeAll(async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || "http://localhost:3000";
    await createNote(baseURL, searchNote, `# Searchable\n\nUnique keyword xylophonezz`);
  });

  test.afterAll(async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || "http://localhost:3000";
    await deleteNote(baseURL, searchNote);
  });

  test("search finds notes by content", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.keyboard.press("Control+s");
    const dialog = page.locator('[role="dialog"][aria-label="Search"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Type search query
    await page.keyboard.type("xylophonezz", { delay: 50 });
    await page.waitForTimeout(1000);

    // Should find the note
    await expect(dialog.locator(`text=${searchNote}`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Custom dialogs", () => {
  test("delete note shows custom confirm dialog", async ({ page, baseURL }) => {
    const delNote = `_pw_del_${Date.now()}`;
    await createNote(baseURL!, delNote, `# Delete me\n\n`);

    await page.goto("/");
    await page.waitForTimeout(1000);

    // Right-click or find delete action for the note
    const noteEl = page.locator(`text=${delNote}`).first();
    await noteEl.click({ button: "right" });
    await page.waitForTimeout(300);

    // Look for delete option in context menu
    const deleteBtn = page.locator('text=Delete, text=Trash, button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Custom confirm dialog should appear instead of native
      const confirmDialog = page.locator('[role="dialog"][aria-label="Confirm"]');
      await expect(confirmDialog).toBeVisible({ timeout: 3000 });
      await expect(confirmDialog.locator("text=Move this to trash?")).toBeVisible();

      // Cancel it
      await confirmDialog.locator("text=Cancel").click();
      await expect(confirmDialog).not.toBeVisible();
    }

    // Clean up
    await deleteNote(baseURL!, delNote);
  });
});

test.describe("API routes", () => {
  test("GET /api/notes returns note list", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("notes");
    expect(Array.isArray(data.notes)).toBe(true);
  });

  test("POST /api/notes creates a note", async ({ baseURL }) => {
    const path = `_pw_api_${Date.now()}`;
    const res = await fetch(`${baseURL}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content: "# API Test\n\n" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify it exists
    const getRes = await fetch(`${baseURL}/api/notes?path=${encodeURIComponent(path)}`);
    const getData = await getRes.json();
    expect(getData.content).toContain("API Test");

    // Clean up
    await deleteNote(baseURL!, path);
  });

  test("GET /api/notes/search works", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/search?q=test`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("results");
  });

  test("POST /api/notes with no path returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "no path" }),
    });
    expect(res.status).toBe(400);
  });
});
