import { chromium } from "playwright";
import { execSync } from "child_process";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const VOICE = "Samantha";
const RATE = 175;
const TMP = resolve("./demo-tmp");
const OUT_DIR = resolve("./demo-videos");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function genVO(id, text) {
  const out = join(TMP, `vo-${id}.aiff`);
  execSync(`say -v "${VOICE}" -r ${RATE} -o "${out}" "${text.replace(/"/g, '\\"')}"`);
  const wavOut = join(TMP, `vo-${id}.wav`);
  execSync(`ffmpeg -y -i "${out}" -ar 22050 -ac 1 "${wavOut}" 2>/dev/null`);
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${wavOut}"`).toString().trim());
  return { file: wavOut, duration: dur };
}

function genSilence(id, seconds) {
  const out = join(TMP, `silence-${id}.wav`);
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=22050:cl=mono -t ${seconds} "${out}" 2>/dev/null`);
  return out;
}

(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log("Generating voiceover...");

  const scenes = [
    { id: "01", vo: "Meet Noctivault. Your second brain, powered by Novyx AI memory.", wait: 4.0 },
    { id: "02", vo: "Notes are organized into folders. Research, Projects, Daily reviews.", wait: 4.5 },
    { id: "03", vo: "Let's open the Noctivault project note. The split view shows your markdown on the left and a live preview on the right.", wait: 5.5 },
    { id: "04", vo: "Watch the bottom of the screen. Ghost Connections are loading. These are notes that AI discovered are related, even without explicit links.", wait: 7.0 },
    { id: "05", vo: "Five connections found automatically. Each one has a colored badge showing how it was discovered — through shared tags, content similarity, or semantic meaning.", wait: 7.0 },
    { id: "06", vo: "Click a Ghost Connection, and it takes you directly to that note.", wait: 4.0 },
    { id: "07", vo: "This note links back to the original. See how the wiki-links render as clickable references in the preview.", wait: 5.0 },
    { id: "08", vo: "The Remember button saves this note to Novyx semantic memory. Now AI can recall its contents when discovering connections to other notes.", wait: 6.0 },
    { id: "09", vo: "Full-text search finds anything instantly. Watch as results appear while you type.", wait: 5.5 },
    { id: "10", vo: "Note info shows word count, reading time, headings, and links at a glance.", wait: 5.0 },
    { id: "11", vo: "Table of contents generates an outline from your headings. Click to jump anywhere.", wait: 4.5 },
    { id: "12", vo: "Focus mode strips away everything. Just you, your words, and nothing else.", wait: 5.0 },
    { id: "13", vo: "Let's create a new note and watch Ghost Connections discover its relationships in real time.", wait: 4.0 },
    { id: "14", vo: "As we type about AI and memory, watch the connections appear automatically below.", wait: 12.0 },
    { id: "15", vo: "Ghost Connections already found related notes, without us linking anything. That's the power of Novyx.", wait: 6.0 },
    { id: "16", vo: "Noctivault. Your knowledge, connected by AI. Powered by Novyx.", wait: 5.0 },
  ];

  // Generate all VO
  const clips = [];
  for (const s of scenes) {
    const vo = genVO(s.id, s.vo);
    const sceneTime = Math.max(vo.duration + 0.5, s.wait);
    clips.push({ ...s, voFile: vo.file, voDuration: vo.duration, sceneTime });
    console.log(`  ${s.id}: ${vo.duration.toFixed(1)}s VO, ${sceneTime.toFixed(1)}s scene`);
  }

  // Build narration track
  console.log("\nBuilding narration...");
  const wavParts = [];
  for (const c of clips) {
    wavParts.push(c.voFile);
    const pad = Math.max(0.3, c.sceneTime - c.voDuration);
    wavParts.push(genSilence(c.id, pad));
  }

  const concatList = join(TMP, "concat.txt");
  writeFileSync(concatList, wavParts.map((f) => `file '${f}'`).join("\n"));
  const fullAudio = join(TMP, "narration.wav");
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${fullAudio}" 2>/dev/null`);
  const audioDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${fullAudio}"`).toString().trim());
  console.log(`Narration: ${audioDur.toFixed(1)}s`);

  // --- RECORD ---
  console.log("\nRecording...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await sleep(1000);

  // Scene 1: Opening shot (4s)
  console.log("  01: Opening");
  await sleep(clips[0].sceneTime * 1000);

  // Scene 2: Show folders (4.5s) — expand all folders
  console.log("  02: Folder structure");
  for (const folder of ["Research", "Projects", "Daily"]) {
    const el = page.locator(`text=${folder}`).first();
    if (await el.isVisible()) { await el.click(); await sleep(600); }
  }
  await sleep((clips[1].sceneTime - 1.8) * 1000);

  // Scene 3: Open Noctivault note (5.5s)
  console.log("  03: Open Noctivault note");
  const noctNote = page.locator("text=Noctivault-Second-Brain").first();
  if (await noctNote.isVisible()) await noctNote.click();
  await sleep(clips[2].sceneTime * 1000);

  // Scene 4: Ghost connections loading (7s)
  console.log("  04: Ghost Connections loading");
  // Scroll down slightly to show the connections panel
  await page.mouse.wheel(0, 200);
  await sleep(2000);
  await page.mouse.wheel(0, -200);
  await sleep((clips[3].sceneTime - 2) * 1000);

  // Scene 5: Highlight connections (7s) — hover over them
  console.log("  05: Showing connections");
  const connItems = page.locator(".ghost-fade-in");
  const connCount = await connItems.count();
  for (let i = 0; i < Math.min(connCount, 3); i++) {
    await connItems.nth(i).hover();
    await sleep(1500);
  }
  await sleep(Math.max(0, (clips[4].sceneTime - connCount * 1.5) * 1000));

  // Scene 6: Click a Ghost Connection (4s)
  console.log("  06: Click connection");
  const knowledgeConn = page.locator("text=Knowledge-Graphs").first();
  if (await knowledgeConn.isVisible()) {
    await knowledgeConn.click();
    await sleep(clips[5].sceneTime * 1000);
  } else {
    // Click first connection
    if (connCount > 0) { await connItems.first().click(); }
    await sleep(clips[5].sceneTime * 1000);
  }

  // Scene 7: Show wiki-links in preview (5s)
  console.log("  07: Wiki-links in preview");
  await sleep(clips[6].sceneTime * 1000);

  // Scene 8: Remember button (6s)
  console.log("  08: Remember to Novyx");
  const rememberBtn = page.locator("button[title='Remember this note']");
  if (await rememberBtn.isVisible()) {
    await rememberBtn.click();
    await sleep(clips[7].sceneTime * 1000);
  }

  // Scene 9: Search (5.5s)
  console.log("  09: Search");
  const searchInput = page.locator("input[placeholder*='Search']").first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await sleep(300);
    await searchInput.type("memory", { delay: 120 });
    await sleep(2000);
    // Click AI Memory Systems result
    const memResult = page.locator("text=AI-Memory-Systems").first();
    if (await memResult.isVisible()) {
      await memResult.click();
      await sleep(2000);
    }
  }

  // Scene 10: Note info (5s)
  console.log("  10: Note info");
  const infoBtn = page.locator("button[title='Note info']");
  if (await infoBtn.isVisible()) {
    await infoBtn.click();
    await sleep(3500);
    await infoBtn.click();
    await sleep(1500);
  }

  // Scene 11: TOC (4.5s)
  console.log("  11: Table of Contents");
  const tocBtn = page.locator("button[title='Table of Contents']");
  if (await tocBtn.isVisible()) {
    await tocBtn.click();
    await sleep(1500);
    // Click a heading
    const tocItem = page.locator("text=Architecture Patterns").first();
    if (await tocItem.isVisible()) await tocItem.click();
    await sleep(1500);
    await tocBtn.click();
    await sleep(1000);
  }

  // Scene 12: Focus mode (5s)
  console.log("  12: Focus mode");
  const focusBtn = page.locator("button[title*='Focus Mode']");
  if (await focusBtn.isVisible()) {
    await focusBtn.click();
    await sleep(3500);
    await page.keyboard.press("Escape");
    await sleep(1500);
  }

  // Scene 13: Create new note (4s)
  console.log("  13: Create new note");
  const newNoteBtn = page.locator("button[title*='New note'], button[title*='new note']").first();
  if (await newNoteBtn.isVisible()) {
    await newNoteBtn.click();
    await sleep(800);
    const nameInput = page.locator("input").last();
    if (await nameInput.isVisible()) {
      await nameInput.fill("");
      await nameInput.type("Semantic Search Ideas", { delay: 60 });
      await nameInput.press("Enter");
      await sleep(2000);
    }
  }

  // Scene 14: Type content and watch connections appear (12s)
  console.log("  14: Typing + live connections");
  const editor = page.locator(".cm-content").first();
  if (await editor.isVisible()) {
    await editor.click();
    await sleep(300);
    const lines = [
      "# Semantic Search Ideas",
      "",
      "## Concept",
      "Build a search engine that understands meaning, not just keywords.",
      "Use embedding models to convert queries and documents into vectors.",
      "",
      "## Connection to Novyx",
      "The Novyx SDK already does this for memory recall.",
      "Could we extend it to full-document search?",
      "",
      "## Notes",
      "- Review [[AI Memory Systems]] for architecture patterns",
      "- Check [[Embedding Models]] for model comparison",
      "",
      "#ai #search #novyx #embeddings",
    ];
    for (const line of lines) {
      await editor.pressSequentially(line, { delay: 20 });
      await editor.press("Enter");
      await sleep(100);
    }
    await sleep(3000);
  }

  // Scene 15: Ghost Connections on new note (6s)
  console.log("  15: Ghost Connections on new note");
  // Wait for connections to load
  await sleep(clips[14].sceneTime * 1000);

  // Scene 16: Final shot (5s)
  console.log("  16: Final");
  await sleep(clips[15].sceneTime * 1000);

  // Done
  console.log("  Closing...");
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  console.log(`\nMerging video + narration...`);
  const finalOutput = "/Users/blakeheron/Desktop/Noctivault-Demo.mp4";
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${fullAudio}" ` +
    `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 160k -shortest ` +
    `"${finalOutput}" 2>/dev/null`
  );

  const size = execSync(`ls -lh "${finalOutput}" | awk '{print $5}'`).toString().trim();
  console.log(`\nDone! ${finalOutput} (${size})`);
  execSync(`rm -rf "${TMP}"`);
})();
