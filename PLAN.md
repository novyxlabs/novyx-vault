# Developer Context Capture — Plan

Five features that feed the Novyx memory graph with developer-specific context, keeping Vault firmly in the developer tools space.

---

## 1. Git Commit Ingestion

**What:** Auto-summarize recent git activity into memory. User points Vault at a local repo (or connects GitHub), and it extracts commit messages, diffs, and file changes into concise daily summaries stored in Novyx memory.

**Implementation:**
- New API route `POST /api/ingest/git` — accepts a repo path (local) or GitHub repo URL
- Parses `git log` output (message, author, files changed, insertions/deletions)
- Groups commits by day, generates a markdown summary via AI
- Stores in Novyx memory with tags: `source:git`, `repo:<name>`, `date:<iso>`
- New component `GitIngest.tsx` — repo selector + date range + preview before saving
- Cron-friendly: optional daily auto-ingest via API call

**Touches:** `lib/ingest.ts`, new `lib/git.ts`, new API route, new component

---

## 2. Terminal Session Capture

**What:** Paste or pipe terminal output into Vault. Extracts commands, errors, and context into structured memory — so you can recall "how did I fix that Docker issue last month?"

**Implementation:**
- New API route `POST /api/ingest/terminal` — accepts raw terminal text
- Parser extracts command/output pairs (detects `$`/`>`/`#` prompts)
- AI summarizes: what was attempted, what worked, key errors
- Stores in Novyx memory with tags: `source:terminal`, `topic:<inferred>`
- New component `TerminalCapture.tsx` — paste box with parsed preview
- Optional: CLI companion script (`vault-capture.sh`) that pipes `script` output

**Touches:** new `lib/terminal-parser.ts`, new API route, new component

---

## 3. Browser Dev Tool Snippets

**What:** Save stack traces, console output, and documentation excerpts into Vault. Lightweight — just a paste target with smart parsing.

**Implementation:**
- Extend existing `/api/ingest` route with `type: "devtools"` parameter
- Parser detects content type: stack trace, console log, JSON response, or doc excerpt
- Stack traces get deobfuscated/formatted and linked to relevant notes
- Stores as a note in `DevTools/` folder + Novyx memory with `source:devtools`
- New component `DevToolsCapture.tsx` — paste + auto-detect + tag
- Bookmarklet generator for quick capture from browser

**Touches:** `lib/ingest.ts` (extend), new API route handler, new component

---

## 4. PR Review Notes

**What:** Capture code review context. Pull PR details from GitHub, summarize the discussion, and store the review as structured memory.

**Implementation:**
- New API route `POST /api/ingest/github-pr` — accepts PR URL or `owner/repo#number`
- Uses GitHub API (no auth for public, PAT for private) to fetch:
  - PR title, description, diff stats
  - Review comments and threads
  - Status/outcome
- AI generates a review summary: what changed, key feedback, decisions made
- Stores in Novyx memory with tags: `source:github`, `pr:<number>`, `repo:<name>`
- New component `PRCapture.tsx` — URL input + summary preview + edit before save
- Links to related git commit memories automatically

**Touches:** new `lib/github.ts`, new API route, new component

---

## 5. Markdown Daily Standup

**What:** A lightweight daily note template that prompts: what you did, what you're doing, blockers. No audio, no meetings — just text that feeds memory.

**Implementation:**
- New API route `POST /api/standup` — saves standup + stores in Novyx memory
- Template with three sections: Yesterday / Today / Blockers
- Auto-populates "Yesterday" from recent git commits + terminal sessions if available
- Stores in `Standups/YYYY-MM-DD.md` + Novyx memory with `source:standup`
- New component `StandupPrompt.tsx` — quick-entry modal, keyboard-friendly
- Standup history view with streak tracking
- Feeds into existing weekly review and morning briefing features

**Touches:** new API route, new component, integrates with `lib/memory.ts`

---

## Shared Infrastructure

- **New `lib/ingest/` directory** — refactor existing `lib/ingest.ts` into modular ingest pipeline with shared utilities (AI summarization, tag extraction, memory storage)
- **Ingest dashboard component** — unified view of all captured context across sources
- **Source tags** — consistent tagging scheme (`source:git`, `source:terminal`, etc.) for filtering in memory/graph views
- **Settings** — user preferences for which sources are enabled, default repos, GitHub PAT storage

## Build Order

1. Shared ingest infrastructure (refactor)
2. Git Commit Ingestion (highest value, most concrete)
3. Markdown Daily Standup (simplest, quick win)
4. Terminal Session Capture
5. PR Review Notes
6. Browser Dev Tool Snippets
