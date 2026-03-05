import { test, expect, Page } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

const INDIGO = "#6366f1";
const INDIGO_DARK = "#4f46e5";
const SPEED = 28; // ms per keystroke — snappy but visible
const BEAT = 600; // short pause between actions
const SCENE = 1800; // pause to let viewer absorb a scene
const DRAMATIC = 3000; // longer pause for impact moments

async function typeText(page: Page, text: string) {
  await page.keyboard.type(text, { delay: SPEED });
}

async function overlay(
  page: Page,
  text: string,
  subtext = "",
  durationMs = 3000,
  style: "banner" | "endcard" | "label" = "banner"
) {
  await page.evaluate(
    ({ text, subtext, durationMs, style, INDIGO }) => {
      const existing = document.getElementById("demo-overlay");
      if (existing) existing.remove();

      const div = document.createElement("div");
      div.id = "demo-overlay";
      if (style === "label") div.style.pointerEvents = "none";

      if (style === "endcard") {
        div.innerHTML = `
          <div style="
            position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            background:linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
            animation:fadeIn 0.8s ease;
          ">
            <div style="font-size:52px;font-weight:800;color:white;letter-spacing:-1px;
              font-family:system-ui;margin-bottom:12px;">
              This is <span style="color:${INDIGO}">Novyx</span>.
            </div>
            <div style="font-size:24px;color:rgba(255,255,255,0.5);font-weight:400;
              font-family:system-ui;margin-bottom:40px;">
              Memory for AI.
            </div>
            <div style="font-size:16px;color:${INDIGO};font-family:monospace;
              letter-spacing:2px;opacity:0.7;">
              novyxlabs.com
            </div>
            ${subtext ? `<div style="font-size:14px;color:rgba(255,255,255,0.3);margin-top:24px;font-family:system-ui;">${subtext}</div>` : ""}
          </div>
          <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
        `;
      } else if (style === "label") {
        div.innerHTML = `
          <div style="
            position:fixed;top:20px;right:20px;z-index:99999;
            background:${INDIGO};color:white;
            padding:8px 20px;border-radius:8px;
            font-size:13px;font-weight:600;font-family:system-ui;
            letter-spacing:0.5px;
            box-shadow:0 4px 24px rgba(99,102,241,0.4);
            animation:slideIn 0.4s ease;
          ">
            ${text}
          </div>
          <style>@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}</style>
        `;
      } else {
        div.innerHTML = `
          <div style="
            position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);
            animation:fadeIn 0.5s ease;
          ">
            <div style="font-size:36px;font-weight:700;color:white;text-align:center;
              font-family:system-ui;max-width:700px;line-height:1.3;">
              ${text}
            </div>
            ${subtext ? `<div style="font-size:18px;color:rgba(255,255,255,0.4);margin-top:16px;font-family:system-ui;">${subtext}</div>` : ""}
          </div>
          <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
        `;
      }

      document.body.appendChild(div);
      if (durationMs > 0) {
        setTimeout(() => {
          div.style.transition = "opacity 0.5s ease";
          div.style.opacity = "0";
          setTimeout(() => div.remove(), 500);
        }, durationMs);
      }
    },
    { text, subtext, durationMs, style, INDIGO }
  );
  if (durationMs > 0) {
    await page.waitForTimeout(durationMs + 600);
  } else {
    await page.waitForTimeout(SCENE);
  }
}

async function clearOverlay(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById("demo-overlay");
    if (el) {
      el.style.transition = "opacity 0.5s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 500);
    }
  });
  await page.waitForTimeout(600);
}

// Seed notes via API to avoid UI creation delays
async function seedNote(page: Page, name: string, content: string) {
  await page.evaluate(
    async ({ name, content }) => {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `${name}.md`, content }),
      });
    },
    { name, content }
  );
}

async function deleteNote(page: Page, name: string) {
  await page.evaluate(
    async ({ name }) => {
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `${name}.md` }),
      });
    },
    { name }
  );
}

// Mock chat responses for consistent demo
function mockChatResponse(text: string, memoriesRecalled = 0) {
  const lines: string[] = [];

  if (memoriesRecalled > 0) {
    lines.push(`data: ${JSON.stringify({ meta: { memoriesRecalled } })}`);
  }

  // Stream word-by-word for visual effect
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? "" : " ") + words[i];
    lines.push(`data: ${JSON.stringify({ text: chunk })}`);
  }
  lines.push("data: [DONE]");

  return lines.join("\n\n");
}

// ── Note Content ─────────────────────────────────────────────────────────────

const NOTE_STARTUP = `# AI Tutoring Platform — Startup Concept

## Problem
Traditional tutoring doesn't scale. 1-on-1 tutors are $60-120/hr. Most students can't afford consistent help.

## Hypothesis
An AI tutor that adapts to each student's learning style could provide 80% of the value of a human tutor at 1/50th the cost.

## Key Questions
- How do we measure "learning style" computationally?
- What's the minimum viable personalization that moves the needle?
- Regulatory landscape for AI in education (FERPA, COPPA)

## Revenue Model
Freemium: free for basic use, $19/mo for advanced features, $99/mo for school licenses.

#startup #edtech #ai-tutoring`;

const NOTE_RESEARCH = `# Spaced Repetition & Adaptive Learning — Research Notes

## Core Paper: Pimsleur (1967)
Memory strength decays exponentially. Optimal review intervals: 1d, 3d, 7d, 14d, 30d.

## Key Insight
The forgetting curve is predictable — and personalizeable. Students who are quizzed at their optimal interval retain 2.3x more than fixed-schedule students.

## Modern Implementations
- **Anki**: Uses SM-2 algorithm. Effective but UX is painful.
- **Duolingo**: Adaptive difficulty + spaced repetition. Gamification drives retention.
- **Quizlet**: Moving toward AI-generated study plans.

## Connection to AI Tutoring
If we can model each student's forgetting curve individually, the AI tutor could time reviews perfectly. This is the competitive moat — personalized spacing that no human tutor can replicate.

#research #spaced-repetition #learning-science`;

const NOTE_COMPETITOR = `# Competitor Analysis — EdTech AI Space

## Direct Competitors
| Company | Funding | Approach | Weakness |
|---------|---------|----------|----------|
| Khanmigo | $25M | GPT wrapper on Khan content | No personalization |
| Synthesis | $60M | Group problem-solving | Not 1-on-1 |
| Photomath | Acquired | Math-only OCR solver | Narrow scope |

## Indirect Competitors
- Chegg (pivoting to AI, but brand = cheating)
- Coursera (courses, not tutoring)
- Brilliant.org (great UX, but passive learning)

## Our Edge
None of these competitors have **adaptive memory**. They treat each session as independent. An AI tutor with [[Spaced Repetition & Adaptive Learning — Research Notes|spaced repetition]] baked in would be fundamentally different.

## Timing
GPT-4o and Claude are making "AI tutoring" a crowded pitch. Our differentiation isn't the AI — it's the **memory layer** underneath it.

#competitors #edtech #market-analysis`;

// ── Chat Responses ───────────────────────────────────────────────────────────

const STATELESS_RESPONSE_1 =
  "I can see you have some notes in your vault, but I don't have context about what you were working on previously. Could you tell me more about what you were researching? I'd be happy to help if you can share some details.";

const STATELESS_RESPONSE_2 =
  "Spaced repetition is a learning technique that involves reviewing material at increasing intervals. It could potentially be applied to tutoring platforms. Without more context about your specific startup idea, I can only offer general suggestions about how these concepts might connect.";

const MEMORY_RESPONSE_1 =
  "Based on your recent work, you've been deep in **EdTech AI** research. Specifically:\n\n" +
  "- You outlined an **AI Tutoring Platform** concept — freemium model, targeting the $60-120/hr tutoring gap\n" +
  "- You researched **Pimsleur's spaced repetition** findings — the 2.3x retention improvement from personalized intervals\n" +
  "- Your **competitor analysis** identified that no current player (Khanmigo, Synthesis, Photomath) has adaptive memory as a feature\n\n" +
  "Your core thesis seems to be: **personalized forgetting curves** are the competitive moat, not the AI model itself.";

const MEMORY_RESPONSE_2 =
  "This is actually the strongest connection in your research. Here's the synthesis:\n\n" +
  "**Pimsleur's 1967 finding** showed memory decays exponentially — but the curve is *individual*. Your startup concept targets 80% of tutor value at 1/50th cost.\n\n" +
  "**The bridge**: If your AI tutor models each student's personal forgetting curve (from the spaced repetition research), it can time reviews with precision no human tutor can match. You noted this yourself:\n\n" +
  "> *\"Personalized spacing that no human tutor can replicate\"*\n\n" +
  "Your competitor analysis confirms nobody else is doing this — Khanmigo has no personalization, Synthesis does group work, Photomath is math-only. **Adaptive memory IS your moat.**";

const PROACTIVE_RESPONSE =
  "Based on the pattern across your notes, I'd suggest exploring **adaptive learning algorithms** — specifically:\n\n" +
  "1. **DKT (Deep Knowledge Tracing)** — Neural networks that predict student knowledge state in real-time. This directly extends your spaced repetition research into something implementable.\n\n" +
  '2. **The "Goldilocks Zone" paper (2019)** — Found that questions at 85% expected accuracy maximally drive learning. Your AI tutor could use this as the difficulty calibration target.\n\n' +
  "3. **Multi-armed bandit approaches** to content selection — treating each topic as an arm, optimizing for long-term retention rather than short-term engagement.\n\n" +
  "You haven't written about any of these yet, but they're the natural next step from where your research is pointing. The spaced repetition work gives you the *when* to review — these would give you the *what* and *how hard*.";

// ── Test ──────────────────────────────────────────────────────────────────────

test("Novyx Demo — Memory Changes Everything", async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000); // 5 minutes for the full demo
  // Set up fake AI provider in localStorage so chat works (routes are mocked)
  await page.goto("/");
  await page.evaluate(() => {
    const settings = {
      providers: [{
        id: "demo",
        name: "Demo Provider",
        baseURL: "http://localhost:11434/v1",
        apiKey: "not-needed",
        model: "demo-model",
      }],
      activeProviderId: "demo",
    };
    localStorage.setItem("noctivault-ai-settings", JSON.stringify(settings));
  });
  await page.reload();
  await page.waitForTimeout(2000);

  // Clean up any existing demo notes
  for (const name of [
    "AI Tutoring Platform — Startup Concept",
    "Spaced Repetition & Adaptive Learning — Research Notes",
    "Competitor Analysis — EdTech AI Space",
  ]) {
    await deleteNote(page, name);
  }
  await page.waitForTimeout(500);

  // ════════════════════════════════════════════════════════════════════════════
  // TITLE CARD
  // ════════════════════════════════════════════════════════════════════════════

  await overlay(
    page,
    "What if your AI <span style='color:" + INDIGO + "'>remembered</span> everything?",
    "A Novyx Vault + Novyx demo",
    4000
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ACT 1 — WITHOUT MEMORY
  // ════════════════════════════════════════════════════════════════════════════

  await overlay(
    page,
    "Act 1: <span style='color:#ef4444'>Without</span> Memory",
    "Every session starts from zero.",
    3000
  );

  // Seed the 3 notes
  await seedNote(page, "AI Tutoring Platform — Startup Concept", NOTE_STARTUP);
  await seedNote(page, "Spaced Repetition & Adaptive Learning — Research Notes", NOTE_RESEARCH);
  await seedNote(page, "Competitor Analysis — EdTech AI Space", NOTE_COMPETITOR);
  await page.reload();
  await page.waitForSelector('text="AI Tutoring Platform — Startup Concept"', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Mock ghost connections as empty for Act 1
  await page.route("**/api/notes/connections*", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connections: [] }),
    });
  });

  // Mock weekly review as minimal for Act 1
  await page.route("**/api/notes/weekly-review", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period: { from: new Date(Date.now() - 7 * 86400000).toISOString(), to: new Date().toISOString() },
        vault: { totalNotes: 3, totalWords: 507, notesModified: 3, wordsInModified: 507 },
        activity: { recentNotes: [], topTags: [], linksInModified: 1 },
        tasks: { pending: 0, completedThisWeek: 0, sample: [] },
        memory: { totalMemories: 0, insights: [], drift: null },
      }),
    });
  });

  // Show the label for this section
  await overlay(page, "NO MEMORY CONNECTED", "", 0, "label");

  // Click through notes quickly to show they exist
  await page.click('text="AI Tutoring Platform — Startup Concept"');
  await page.waitForTimeout(SCENE);
  await page.click('text="Spaced Repetition & Adaptive Learning — Research Notes"');
  await page.waitForTimeout(SCENE);
  await page.click('text="Competitor Analysis — EdTech AI Space"');
  await page.waitForTimeout(SCENE);

  // Mock stateless chat responses
  await page.route("**/api/chat", async (route) => {
    const body = await route.request().postDataJSON();
    const lastMsg = body.messages?.[body.messages.length - 1]?.content || "";

    let response: string;
    if (lastMsg.toLowerCase().includes("researching")) {
      response = mockChatResponse(STATELESS_RESPONSE_1);
    } else if (lastMsg.toLowerCase().includes("spaced repetition")) {
      response = mockChatResponse(STATELESS_RESPONSE_2);
    } else {
      response = mockChatResponse("I'm not sure what you're referring to. Could you provide more details?");
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: response,
    });
  });

  // Open chat
  await page.click('button[title="AI Chat"]');
  await page.waitForTimeout(BEAT);

  // Ask question 1
  const chatInput = page.locator('textarea[placeholder="Ask about your notes..."]');
  await chatInput.click();
  await typeText(page, "What was I researching last week?");
  await page.waitForTimeout(BEAT);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000); // Let response stream

  // Ask question 2
  await chatInput.click();
  await typeText(page, "How does spaced repetition connect to my startup idea?");
  await page.waitForTimeout(BEAT);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);

  // Close chat
  await page.click('button[title="AI Chat"]');
  await page.waitForTimeout(BEAT);

  // Show ghost connections (empty)
  // Click on a note first to see ghost connections panel
  await page.click('text="AI Tutoring Platform — Startup Concept"');
  await page.waitForTimeout(2000);

  // Try Weekly Review
  await clearOverlay(page);
  await page.click('button[title="Weekly review"]');
  await page.waitForTimeout(SCENE);
  // Close it — click the X button in the modal header
  await page.mouse.click(10, 10);
  await page.waitForTimeout(BEAT);

  // Verdict
  await overlay(
    page,
    "Generic answers. No connections. <span style='color:#ef4444'>No memory.</span>",
    "The AI sees each session as day one.",
    3500
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ACT 2 — WITH NOVYX MEMORY
  // ════════════════════════════════════════════════════════════════════════════

  await overlay(
    page,
    "Act 2: <span style='color:" + INDIGO + "'>With</span> Novyx Memory",
    "Same notes. Same questions. Different AI.",
    3000
  );

  // Swap chat mock to memory-powered responses
  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    const body = await route.request().postDataJSON();
    const lastMsg = body.messages?.[body.messages.length - 1]?.content || "";

    let response: string;
    if (lastMsg.toLowerCase().includes("researching")) {
      response = mockChatResponse(MEMORY_RESPONSE_1, 3);
    } else if (lastMsg.toLowerCase().includes("spaced repetition")) {
      response = mockChatResponse(MEMORY_RESPONSE_2, 3);
    } else if (lastMsg.toLowerCase().includes("write about next") || lastMsg.toLowerCase().includes("should i")) {
      response = mockChatResponse(PROACTIVE_RESPONSE, 3);
    } else {
      response = mockChatResponse("Based on your memories, I can help with that. Let me check your recent research...");
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: response,
    });
  });

  // Mock ghost connections — swap from empty to rich
  await page.unroute("**/api/notes/connections*");
  await page.route("**/api/notes/connections*", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connections: [
          {
            noteName: "Spaced Repetition & Adaptive Learning — Research Notes",
            notePath: "Spaced Repetition & Adaptive Learning — Research Notes.md",
            connectionType: "semantic",
            score: 0.92,
            snippet: "Personalized spacing that no human tutor can replicate — the competitive moat.",
          },
          {
            noteName: "Competitor Analysis — EdTech AI Space",
            notePath: "Competitor Analysis — EdTech AI Space.md",
            connectionType: "content",
            score: 0.87,
            snippet: "None of these competitors have adaptive memory. Our edge is the memory layer.",
          },
        ],
      }),
    });
  });

  // Mock weekly review with rich data — swap from minimal
  await page.unroute("**/api/notes/weekly-review");
  await page.route("**/api/notes/weekly-review", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: {
            from: new Date(Date.now() - 7 * 86400000).toISOString(),
            to: new Date().toISOString(),
          },
          vault: { totalNotes: 47, totalWords: 18420, notesModified: 12, wordsInModified: 4830 },
          activity: {
            recentNotes: [
              { name: "AI Tutoring Platform — Startup Concept", path: "AI Tutoring Platform — Startup Concept.md", wordCount: 142, modifiedAt: new Date().toISOString() },
              { name: "Spaced Repetition & Adaptive Learning", path: "Spaced Repetition & Adaptive Learning — Research Notes.md", wordCount: 198, modifiedAt: new Date(Date.now() - 86400000).toISOString() },
              { name: "Competitor Analysis — EdTech AI Space", path: "Competitor Analysis — EdTech AI Space.md", wordCount: 167, modifiedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
            ],
            topTags: [
              { tag: "edtech", count: 8 },
              { tag: "ai-tutoring", count: 5 },
              { tag: "spaced-repetition", count: 4 },
              { tag: "research", count: 3 },
              { tag: "startup", count: 3 },
            ],
            linksInModified: 7,
          },
          tasks: { pending: 3, completedThisWeek: 5, sample: [{ text: "Research DKT papers", note: "Research.md" }] },
          memory: {
            totalMemories: 34,
            insights: [
              { observation: "Your research is converging on a thesis: adaptive memory is the moat in EdTech AI, not the model itself.", tags: ["edtech", "strategy"], importance: 0.95 },
              { observation: "Strong pattern: you return to spaced repetition concepts across multiple notes — this is becoming a core mental model.", tags: ["learning-science"], importance: 0.88 },
            ],
            drift: {
              memoryDelta: 12,
              importanceDelta: 0.15,
              newTopics: ["adaptive-learning", "forgetting-curves", "edtech-moat"],
              lostTopics: ["general-ai"],
              tagShifts: [{ tag: "edtech", countFrom: 2, countTo: 8, delta: 6 }],
            },
          },
        }),
      });
    } else {
      // POST — AI digest
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: mockChatResponse(
          "## This Week in Your Vault\n\n" +
            "You're building something. The pattern is clear: three notes, one thesis — **adaptive memory is the moat in EdTech AI**.\n\n" +
            "### Highlights\n" +
            "- Your startup concept crystallized around the $60-120/hr tutoring gap\n" +
            "- The Pimsleur research gave you the scientific backing: 2.3x retention with personalized intervals\n" +
            "- Competitor analysis confirmed: nobody else is doing this\n\n" +
            "### What's Emerging\n" +
            "The tag `#edtech` went from 2 to 8 mentions. `#adaptive-learning` is brand new. You're narrowing focus — that's a good sign.\n\n" +
            "### Suggestion\n" +
            "You have the *why* and the *who*. Next week, write the *how* — look into Deep Knowledge Tracing and multi-armed bandit algorithms for content selection."
        ),
      });
    }
  });

  // Show label
  await overlay(page, "NOVYX MEMORY ACTIVE", "", 0, "label");

  // Navigate to startup note (scope to sidebar to avoid matching chat history)
  await page.locator('aside').locator('text="AI Tutoring Platform — Startup Concept"').click();
  await page.waitForTimeout(BEAT);

  // Open chat
  await page.click('button[title="AI Chat"]');
  await page.waitForTimeout(BEAT);

  // Ask the SAME question 1
  await chatInput.click();
  await typeText(page, "What was I researching last week?");
  await page.waitForTimeout(BEAT);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000); // Longer — the response is detailed

  // Ask the SAME question 2
  await chatInput.click();
  await typeText(page, "How does spaced repetition connect to my startup idea?");
  await page.waitForTimeout(BEAT);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(7000); // Rich response

  // Close chat
  await page.click('button[title="AI Chat"]');
  await page.waitForTimeout(BEAT);
  await clearOverlay(page);

  // Ghost connections — now they appear
  await page.waitForTimeout(2000); // Let ghost connections load
  // Look for the ghost connections toggle
  const ghostToggle = page.locator("text=ghost connection").first();
  if (await ghostToggle.isVisible()) {
    await ghostToggle.click();
    await page.waitForTimeout(SCENE);
  }

  // Weekly Review
  await page.click('button[title="Weekly review"]');
  await page.waitForTimeout(SCENE);

  // Scroll through the review content
  const reviewModal = page.locator(".fixed.inset-0.z-50 .overflow-y-auto");
  await reviewModal.evaluate((el) => {
    el.scrollTo({ top: el.scrollHeight / 2, behavior: "smooth" });
  });
  await page.waitForTimeout(SCENE);
  await reviewModal.evaluate((el) => {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  });
  await page.waitForTimeout(SCENE);

  // Click "Generate AI Weekly Digest"
  const digestBtn = page.locator("text=Generate AI Weekly Digest");
  if (await digestBtn.isVisible()) {
    await digestBtn.click();
    await page.waitForTimeout(5000); // Let digest stream
  }

  // Close review — click the X button
  await page.mouse.click(10, 10);
  await page.waitForTimeout(BEAT);

  // Memory Dashboard quick flash
  await page.click('button[title="Memory dashboard"]');
  await page.waitForTimeout(SCENE);
  // Click to close — memory dashboard uses Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(BEAT);

  // ════════════════════════════════════════════════════════════════════════════
  // ACT 3 — THE MOMENT
  // ════════════════════════════════════════════════════════════════════════════

  await overlay(
    page,
    "Act 3: <span style='color:" + INDIGO + "'>The Moment</span>",
    "When AI sees what you haven't written yet.",
    3000
  );

  // Open chat
  await page.click('button[title="AI Chat"]');
  await page.waitForTimeout(BEAT);

  await chatInput.click();
  await typeText(page, "What should I write about next?");
  await page.waitForTimeout(BEAT);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(8000); // The big reveal — long response

  // Let it sink in
  await page.waitForTimeout(DRAMATIC);

  // Close chat
  await page.click('button[title="AI Chat"]');
  await page.waitForTimeout(BEAT);

  // ════════════════════════════════════════════════════════════════════════════
  // END CARD
  // ════════════════════════════════════════════════════════════════════════════

  await overlay(page, "", "", 0, "endcard");
  await page.waitForTimeout(6000);

  // Clean up demo notes
  for (const name of [
    "AI Tutoring Platform — Startup Concept",
    "Spaced Repetition & Adaptive Learning — Research Notes",
    "Competitor Analysis — EdTech AI Space",
  ]) {
    await deleteNote(page, name);
  }
});
