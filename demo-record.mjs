import { chromium } from "playwright";

const SLOW = 80; // typing speed ms per char
const PAUSE = 1500;
const LONG_PAUSE = 2500;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: "./demo-videos/",
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await sleep(2000);

  // --- Scene 1: App overview — show sidebar with folders and notes ---
  console.log("Scene 1: App overview");
  await sleep(PAUSE);

  // Click on a folder to expand it
  const novyxFolder = page.locator("text=Novyx").first();
  if (await novyxFolder.isVisible()) {
    await novyxFolder.click();
    await sleep(1000);
  }

  // Click on Novyx Core note
  const novyxNote = page.locator("text=Novyx Core").first();
  if (await novyxNote.isVisible()) {
    await novyxNote.click();
    await sleep(LONG_PAUSE);
  }

  // --- Scene 2: Show split view (editor + preview) ---
  console.log("Scene 2: Split view with content");
  await sleep(LONG_PAUSE);

  // --- Scene 3: Ghost Connections appear ---
  console.log("Scene 3: Ghost Connections loading");
  // Wait for ghost connections to appear
  await sleep(4000);

  // --- Scene 4: Show the breadcrumb and note info ---
  console.log("Scene 4: Note info panel");
  const infoBtn = page.locator("button[title='Note info']");
  if (await infoBtn.isVisible()) {
    await infoBtn.click();
    await sleep(LONG_PAUSE);
    await infoBtn.click(); // close it
    await sleep(500);
  }

  // --- Scene 5: Table of Contents ---
  console.log("Scene 5: Table of Contents");
  const tocBtn = page.locator("button[title='Table of Contents']");
  if (await tocBtn.isVisible()) {
    await tocBtn.click();
    await sleep(LONG_PAUSE);
    await tocBtn.click(); // close
    await sleep(500);
  }

  // --- Scene 6: Search ---
  console.log("Scene 6: Search");
  const searchInput = page.locator("input[placeholder*='Search']").first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await sleep(500);
    await searchInput.type("Heron", { delay: SLOW });
    await sleep(LONG_PAUSE);

    // Click a search result
    const heronResult = page.locator("text=Heron-Homes-CRM-Playbook").first();
    if (await heronResult.isVisible()) {
      await heronResult.click();
      await sleep(LONG_PAUSE);
    }
  }

  // --- Scene 7: Show ghost connections on the new note ---
  console.log("Scene 7: Ghost connections on Heron Homes note");
  await sleep(4000);

  // --- Scene 8: Remember to Novyx ---
  console.log("Scene 8: Remember to Novyx memory");
  const rememberBtn = page.locator("button[title='Remember this note']");
  if (await rememberBtn.isVisible()) {
    await rememberBtn.click();
    await sleep(LONG_PAUSE);
  }

  // --- Scene 9: Create a new note ---
  console.log("Scene 9: Create a new note");
  const newNoteBtn = page.locator("button[title*='New note'], button[title*='new note']").first();
  if (await newNoteBtn.isVisible()) {
    await newNoteBtn.click();
    await sleep(1000);

    // Type note name in the input that appears
    const nameInput = page.locator("input").last();
    if (await nameInput.isVisible()) {
      await nameInput.fill("");
      await nameInput.type("Demo - Noctivault Features", { delay: SLOW });
      await nameInput.press("Enter");
      await sleep(PAUSE);
    }
  }

  // --- Scene 10: Type content with markdown ---
  console.log("Scene 10: Writing markdown content");
  // Find the CodeMirror editor
  const editor = page.locator(".cm-content").first();
  if (await editor.isVisible()) {
    await editor.click();
    await sleep(500);

    const demoContent = [
      "# Noctivault",
      "",
      "A **second brain** powered by [[Novyx Core]] memory.",
      "",
      "## Key Features",
      "",
      "- Ghost Connections: AI discovers hidden links between notes",
      "- Semantic memory via Novyx SDK",
      "- Full-text search across your vault",
      "- Wiki-links with [[backlinks]]",
      "- Split editor + live preview",
      "",
      "#demo #noctivault #novyx",
    ];

    for (const line of demoContent) {
      await editor.pressSequentially(line, { delay: 30 });
      await editor.press("Enter");
      await sleep(200);
    }

    await sleep(LONG_PAUSE);
  }

  // --- Scene 11: Switch to preview mode ---
  console.log("Scene 11: Preview mode");
  const previewBtn = page.locator("button[title='Preview only']");
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await sleep(LONG_PAUSE);
  }

  // Back to split
  const splitBtn = page.locator("button[title='Split view']");
  if (await splitBtn.isVisible()) {
    await splitBtn.click();
    await sleep(PAUSE);
  }

  // --- Scene 12: Focus mode ---
  console.log("Scene 12: Focus mode");
  const focusBtn = page.locator("button[title*='Focus Mode']");
  if (await focusBtn.isVisible()) {
    await focusBtn.click();
    await sleep(LONG_PAUSE);
    await page.keyboard.press("Escape");
    await sleep(PAUSE);
  }

  // --- Scene 13: Sort notes ---
  console.log("Scene 13: Sort notes");
  const sortBtn = page.locator("button[title*='Sort'], button[title*='sort']").first();
  if (await sortBtn.isVisible()) {
    await sortBtn.click();
    await sleep(PAUSE);
    await sortBtn.click();
    await sleep(PAUSE);
  }

  // --- Scene 14: Final pause on the app ---
  console.log("Scene 14: Final overview");
  // Navigate back to Novyx Core to end on ghost connections
  const finalNote = page.locator("text=Novyx Core").first();
  if (await finalNote.isVisible()) {
    await finalNote.click();
    await sleep(4000);
  }

  await sleep(2000);

  // Close
  console.log("Recording complete!");
  await context.close();
  await browser.close();

  console.log("\nVideo saved to ./demo-videos/");
})();
