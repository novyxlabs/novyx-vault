import { chromium } from "playwright";
import { execSync } from "child_process";
import { mkdirSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const VOICE = "Samantha";
const RATE = 175;
const TMP = resolve("./demo-tmp");
const OUT_DIR = resolve("./demo-videos");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Generate a voiceover clip
function genVO(id, text) {
  const out = join(TMP, `vo-${id}.aiff`);
  execSync(`say -v "${VOICE}" -r ${RATE} -o "${out}" "${text.replace(/"/g, '\\"')}"`);
  // Get duration
  const probe = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim();
  return { file: out, duration: parseFloat(probe) };
}

// Generate silence as WAV (compatible for concat)
function genSilence(id, seconds) {
  const out = join(TMP, `silence-${id}.wav`);
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=22050:cl=mono -t ${seconds} "${out}" 2>/dev/null`);
  return out;
}

(async () => {
  // Setup
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log("Generating voiceover clips...");

  const narration = [
    { id: "01", text: "This is Noctivault. A second brain powered by Novyx.", sceneTime: 3.5 },
    { id: "02", text: "Your notes are organized in folders with full markdown support.", sceneTime: 3.5 },
    { id: "03", text: "Opening a note gives you a split view: code on the left, live preview on the right.", sceneTime: 4.0 },
    { id: "04", text: "Ghost Connections. Our AI automatically discovers hidden links between your notes, even without shared keywords.", sceneTime: 7.5 },
    { id: "05", text: "The note info panel shows word count, read time, headings, links, and modification date.", sceneTime: 7.0 },
    { id: "06", text: "Table of contents gives you an outline of every heading in your note.", sceneTime: 3.5 },
    { id: "07", text: "Full text search instantly finds anything across your entire vault.", sceneTime: 5.0 },
    { id: "08", text: "Ghost Connections updates for every note you open, surfacing relationships you might have missed.", sceneTime: 5.0 },
    { id: "09", text: "The remember button saves this note to Novyx semantic memory, making it discoverable by AI across all your notes.", sceneTime: 7.0 },
    { id: "10", text: "Creating a new note is instant. Just start typing.", sceneTime: 3.0 },
    { id: "11", text: "Write markdown with wiki-links, tags, and rich formatting. Everything renders live in the preview.", sceneTime: 14.0 },
    { id: "12", text: "Preview mode for distraction-free reading.", sceneTime: 3.0 },
    { id: "13", text: "Focus mode strips everything away. Just you and your thoughts.", sceneTime: 4.5 },
    { id: "14", text: "Sort your notes by name, date modified, or keep the default order.", sceneTime: 3.0 },
    { id: "15", text: "Noctivault. Your knowledge, connected by AI. Powered by Novyx.", sceneTime: 5.0 },
  ];

  // Generate all VO clips and build timing
  const clips = [];
  for (const n of narration) {
    const vo = genVO(n.id, n.text);
    clips.push({ ...n, voFile: vo.file, voDuration: vo.duration });
    console.log(`  VO ${n.id}: ${vo.duration.toFixed(1)}s - "${n.text.slice(0, 50)}..."`);
  }

  // Convert all VO clips to WAV and build narration with padding
  console.log("\nBuilding narration track...");
  const wavParts = [];
  for (const clip of clips) {
    // Convert AIFF to WAV
    const wavFile = clip.voFile.replace(".aiff", ".wav");
    execSync(`ffmpeg -y -i "${clip.voFile}" -ar 22050 -ac 1 "${wavFile}" 2>/dev/null`);
    wavParts.push(wavFile);
    const padTime = Math.max(0.3, clip.sceneTime - clip.voDuration);
    const silFile = genSilence(clip.id, padTime);
    wavParts.push(silFile);
  }

  // Write concat list with absolute paths
  const concatList = join(TMP, "concat.txt");
  const listContent = wavParts.map((f) => `file '${f}'`).join("\n");
  writeFileSync(concatList, listContent);

  // Concatenate all audio
  const fullAudio = join(TMP, "narration.wav");
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${fullAudio}" 2>/dev/null`);
  const audioDur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${fullAudio}"`).toString().trim();
  console.log(`Narration track: ${parseFloat(audioDur).toFixed(1)}s`);

  // Now record the demo video with matching timing
  console.log("\nRecording demo video...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: TMP,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  // Scene 1: App overview (3.5s)
  console.log("  Recording Scene 1: App overview");
  await sleep(3500);

  // Scene 2: Folder navigation (3.5s)
  console.log("  Recording Scene 2: Folder navigation");
  const novyxFolder = page.locator("text=Novyx").first();
  if (await novyxFolder.isVisible()) await novyxFolder.click();
  await sleep(1500);
  const novyxNote = page.locator("text=Novyx Core").first();
  if (await novyxNote.isVisible()) await novyxNote.click();
  await sleep(2000);

  // Scene 3: Split view (4s)
  console.log("  Recording Scene 3: Split view");
  await sleep(4000);

  // Scene 4: Ghost connections (7.5s)
  console.log("  Recording Scene 4: Ghost Connections");
  await sleep(7500);

  // Scene 5: Note info (7s)
  console.log("  Recording Scene 5: Note info");
  const infoBtn = page.locator("button[title='Note info']");
  if (await infoBtn.isVisible()) {
    await infoBtn.click();
    await sleep(5000);
    await infoBtn.click();
    await sleep(2000);
  }

  // Scene 6: TOC (3.5s)
  console.log("  Recording Scene 6: Table of Contents");
  const tocBtn = page.locator("button[title='Table of Contents']");
  if (await tocBtn.isVisible()) {
    await tocBtn.click();
    await sleep(2500);
    await tocBtn.click();
    await sleep(1000);
  }

  // Scene 7: Search (5s)
  console.log("  Recording Scene 7: Search");
  const searchInput = page.locator("input[placeholder*='Search']").first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await sleep(400);
    await searchInput.type("Heron", { delay: 100 });
    await sleep(1500);
    const heronResult = page.locator("text=Heron-Homes-CRM-Playbook").first();
    if (await heronResult.isVisible()) {
      await heronResult.click();
      await sleep(2000);
    }
  }

  // Scene 8: Ghost connections on new note (5s)
  console.log("  Recording Scene 8: Ghost Connections on Heron note");
  await sleep(5000);

  // Scene 9: Remember (7s)
  console.log("  Recording Scene 9: Remember to Novyx");
  const rememberBtn = page.locator("button[title='Remember this note']");
  if (await rememberBtn.isVisible()) {
    await rememberBtn.click();
    await sleep(7000);
  }

  // Scene 10: Create note (3s)
  console.log("  Recording Scene 10: Create new note");
  const newNoteBtn = page.locator("button[title*='New note'], button[title*='new note']").first();
  if (await newNoteBtn.isVisible()) {
    await newNoteBtn.click();
    await sleep(1000);
    const nameInput = page.locator("input").last();
    if (await nameInput.isVisible()) {
      await nameInput.fill("");
      await nameInput.type("Noctivault Demo", { delay: 80 });
      await nameInput.press("Enter");
      await sleep(1500);
    }
  }

  // Scene 11: Type content (14s)
  console.log("  Recording Scene 11: Writing markdown");
  const editor = page.locator(".cm-content").first();
  if (await editor.isVisible()) {
    await editor.click();
    await sleep(300);
    const lines = [
      "# Noctivault",
      "",
      "A **second brain** powered by [[Novyx Core]] memory.",
      "",
      "## Features",
      "",
      "- Ghost Connections: AI-powered note discovery",
      "- Semantic memory via Novyx SDK",
      "- Full-text search",
      "- Wiki-links and backlinks",
      "",
      "#demo #noctivault #novyx",
    ];
    for (const line of lines) {
      await editor.pressSequentially(line, { delay: 25 });
      await editor.press("Enter");
      await sleep(150);
    }
    await sleep(2000);
  }

  // Scene 12: Preview mode (3s)
  console.log("  Recording Scene 12: Preview mode");
  const previewBtn = page.locator("button[title='Preview only']");
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await sleep(2000);
  }
  const splitBtn = page.locator("button[title='Split view']");
  if (await splitBtn.isVisible()) {
    await splitBtn.click();
    await sleep(1000);
  }

  // Scene 13: Focus mode (4.5s)
  console.log("  Recording Scene 13: Focus mode");
  const focusBtn = page.locator("button[title*='Focus Mode']");
  if (await focusBtn.isVisible()) {
    await focusBtn.click();
    await sleep(3000);
    await page.keyboard.press("Escape");
    await sleep(1500);
  }

  // Scene 14: Sort (3s)
  console.log("  Recording Scene 14: Sort");
  const sortBtn = page.locator("button[title*='Sort'], button[title*='sort']").first();
  if (await sortBtn.isVisible()) {
    await sortBtn.click();
    await sleep(1500);
    await sortBtn.click();
    await sleep(1500);
  }

  // Scene 15: Final (5s)
  console.log("  Recording Scene 15: Final overview");
  const finalNote = page.locator("text=Novyx Core").first();
  if (await finalNote.isVisible()) {
    await finalNote.click();
    await sleep(5000);
  }

  console.log("  Closing browser...");
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  console.log(`\nVideo recorded: ${videoPath}`);
  console.log("Merging video + narration...");

  // Merge video and audio
  const finalOutput = join(OUT_DIR, "Noctivault-Demo.mp4");
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${fullAudio}" ` +
    `-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 128k -shortest ` +
    `"${finalOutput}" 2>/dev/null`
  );

  // Copy to desktop
  execSync(`cp "${finalOutput}" /Users/blakeheron/Desktop/Noctivault-Demo.mp4`);

  console.log(`\nDone! Video saved to Desktop: Noctivault-Demo.mp4`);

  // Cleanup tmp
  execSync(`rm -rf "${TMP}"`);
})();
