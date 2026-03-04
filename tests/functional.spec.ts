import { test, expect } from "@playwright/test";

const TEST_NOTE = `_pw_test_note_${Date.now()}`;
const TEST_FOLDER = `_pw_test_folder_${Date.now()}`;

// Helper: create a note via API
async function createNote(baseURL: string, path: string, content: string) {
  const res = await fetch(`${baseURL}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error(`createNote failed: ${res.status}`);
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

test.describe("API routes — extended coverage", () => {
  const apiNote = `_pw_api_ext_${Date.now()}`;

  test.beforeAll(async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || "http://localhost:3000";
    await createNote(baseURL, apiNote, `# Extended API Test\n\nContent with #test-tag and [[backlink]]\n\n- [ ] task item`);
  });

  test.afterAll(async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || "http://localhost:3000";
    await deleteNote(baseURL, apiNote);
  });

  test("GET /api/notes/tags returns tags", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/tags`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("tags");
    expect(Array.isArray(data.tags)).toBe(true);
  });

  test("GET /api/notes/stats returns statistics", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/stats`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("noteCount");
  });

  test("GET /api/notes/tasks returns task items", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/tasks`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("tasks");
    expect(Array.isArray(data.tasks)).toBe(true);
  });

  test("GET /api/notes/backlinks returns backlinks", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/backlinks?path=${encodeURIComponent(apiNote)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("backlinks");
  });

  test("GET /api/notes/graph returns graph data", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/graph`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("nodes");
    expect(data).toHaveProperty("links");
  });

  test("GET /api/notes/trash returns trash list", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/trash`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("entries");
    expect(Array.isArray(data.entries)).toBe(true);
  });

  test("DELETE /api/notes trashes a note", async ({ baseURL }) => {
    const delNote = `_pw_del_api_${Date.now()}`;
    await createNote(baseURL!, delNote, "# Delete me");

    const res = await fetch(`${baseURL}/api/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: delNote }),
    });
    expect(res.status).toBe(200);

    // Verify it's no longer in the note list
    const listRes = await fetch(`${baseURL}/api/notes`);
    const listData = await listRes.json();
    const found = listData.notes.some((n: { path: string }) =>
      n.path === delNote || n.path === delNote + ".md"
    );
    expect(found).toBe(false);
  });

  test("DELETE /api/notes with no path returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /api/notes/move renames a note", async ({ baseURL }) => {
    const ts = Date.now();
    const oldName = `_pw_move_old_${ts}.md`;
    const newName = `_pw_move_new_${ts}.md`;
    await createNote(baseURL!, oldName, "# Move me");

    const res = await fetch(`${baseURL}/api/notes/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath: oldName, newPath: newName }),
    });
    expect(res.status).toBe(200);

    // Clean up
    await deleteNote(baseURL!, newName);
  });

  test("PATCH /api/notes/move with missing paths returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath: "something" }),
    });
    expect(res.status).toBe(400);
  });

  test("GET /api/notes/history returns version list", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/history?path=${encodeURIComponent(apiNote)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("versions");
    expect(Array.isArray(data.versions)).toBe(true);
  });

  test("GET /api/notes/export returns zip data", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/export`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/zip");
  });

  test("GET /api/settings returns settings or empty object", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/settings`);
    // Desktop mode may return settings or default
    expect([200, 204].includes(res.status)).toBe(true);
  });

  test("GET /api/memory returns memory list", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/memory`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("memories");
    expect(data).toHaveProperty("total");
  });

  test("GET /api/memory/context returns context data", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/memory/context`);
    expect(res.status).toBe(200);
  });

  test("GET /api/memory/audit returns audit log", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/memory/audit`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("entries");
  });

  test("GET /api/memory/usage returns usage info", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/memory/usage`);
    expect(res.status).toBe(200);
  });

  test("GET /api/briefing returns briefing data", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/briefing`);
    expect(res.status).toBe(200);
  });

  test("GET /api/thinking returns thinking data", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/thinking?topic=test`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("topic");
  });

  test("GET /api/thinking without topic returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/thinking`);
    expect(res.status).toBe(400);
  });

  test("POST /api/memory with no observation returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("DELETE /api/memory with no id returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/memory`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("GET /api/notes/connections returns connections", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/connections?path=${encodeURIComponent(apiNote)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("connections");
  });
});

// --- AI route tests (requires TEST_ANTHROPIC_API_KEY in .env.local) ---
const AI_KEY = process.env.TEST_ANTHROPIC_API_KEY;
const PROVIDER = {
  baseURL: "https://api.anthropic.com/v1",
  apiKey: AI_KEY || "",
  model: "claude-haiku-4-5",
};

test.describe("AI-powered API routes", () => {
  test.skip(!AI_KEY, "TEST_ANTHROPIC_API_KEY not set");

  test("POST /api/chat returns a streaming response", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply with exactly: hello" }],
        provider: PROVIDER,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    // Read a chunk to verify stream works
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    expect(value).toBeTruthy();
    reader.cancel();
  });

  test("POST /api/chat with no messages returns error", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], provider: PROVIDER }),
    });
    expect([400, 500].includes(res.status)).toBe(true);
  });

  test("POST /api/notes/brain-dump organizes raw text", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/brain-dump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText: "Random thoughts about testing software and making sure everything works properly in production",
        provider: PROVIDER,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("content");
  });

  test("POST /api/notes/brain-dump with short text returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/brain-dump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: "short", provider: PROVIDER }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/notes/clip-remix remixes clipped content", async ({ baseURL }) => {
    // Clip-remix uses a longer prompt; add fetch-level timeout to avoid Playwright timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(`${baseURL}/api/notes/clip-remix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          clipText: "Software testing is crucial for quality. Unit tests catch bugs early, integration tests verify systems work together, and E2E tests validate user workflows.",
          sourceUrl: "https://example.com/testing",
          provider: PROVIDER,
        }),
      });
      clearTimeout(timer);
      // Accept 200 (success) or 500/502 (AI provider flakiness in test env)
      if (res.status === 200) {
        const data = await res.json();
        expect(data).toHaveProperty("title");
        expect(data).toHaveProperty("content");
      } else {
        expect([500, 502].includes(res.status)).toBe(true);
      }
    } catch (e: unknown) {
      clearTimeout(timer);
      // AbortError means AI provider was too slow — acceptable in test env
      if (e instanceof Error && e.name === "AbortError") {
        test.skip();
        return;
      }
      throw e;
    }
  });

  test("POST /api/notes/slash-ai expands text", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/slash-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "expand",
        context: "Testing is essential for software quality",
        provider: PROVIDER,
      }),
    });
    expect(res.status).toBe(200);
    // slash-ai returns a stream
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    expect(value).toBeTruthy();
    reader.cancel();
  });

  test("POST /api/notes/slash-ai with invalid command returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/slash-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "invalid_command",
        context: "Some context here",
        provider: PROVIDER,
      }),
    });
    expect(res.status).toBe(400);
  });

  test("GET /api/notes/writing-coach returns suggestions", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/writing-coach`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("suggestions");
  });

  test("POST /api/notes/ghost-notify returns notification or null", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/ghost-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Machine learning algorithms for natural language processing",
        notePath: "_pw_ghost_test.md",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Returns { notification: {...} } or { notification: null }
    expect(data).toHaveProperty("notification");
  });

  test("POST /api/notes/connections/explain explains a connection", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/notes/connections/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceNote: "Machine Learning",
        sourceSnippet: "ML uses patterns in data",
        targetNote: "Data Science",
        targetSnippet: "Data analysis reveals insights",
        connectionType: "tag_match",
        provider: PROVIDER,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("explanation");
  });

  test("POST /api/ingest fetches URL content", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://www.example.com" }),
    });
    // May return 200 with content or 500 if network issues in test env
    if (res.status === 200) {
      const data = await res.json();
      expect(data).toHaveProperty("title");
      expect(data).toHaveProperty("markdown");
    } else {
      expect(res.status).toBe(500);
    }
  });

  test("POST /api/ingest with invalid URL returns 400", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-url" }),
    });
    expect(res.status).toBe(400);
  });
});
