# Novyx Obsidian Plugin — Scope & Build Plan

## Strategic context

**The problem:** Tutorials like "Claude Code + Obsidian + Karpathy's prompt" (16M+ views across posts/videos) are creating a generation of Obsidian users who build their own "second brain" and never consider Vault. Once they've invested 22 minutes setting up DIY, they feel ownership of it.

**The insight:** Don't ask them to switch. Ship to where they already are.

**The play:** A Novyx Obsidian plugin that adds our real differentiators — persistent cross-session memory, Ghost Connections, rollback, Cortex insights, audit trail — to existing Obsidian vaults. Trojan horse into the 1.5M Obsidian user base.

## Positioning

> "Obsidian users: upgrade your vault with AI that actually remembers. Persistent memory, rollback, Ghost Connections — works with every vault you already have."

## What DIY + Claude Code can't do (and we will)

These are the features the plugin should lead with, because none of them are possible with just markdown files + an LLM prompt:

1. **Memory that isn't files** — The AI remembers things from conversation that were never written into a note
2. **Memory rollback** — Undo what the AI learned at any point in time
3. **Ghost Connections** — Semantic edges between notes that the LLM never explicitly wrote
4. **Cortex insights** — Proactive pattern surfacing ("three of your notes this week touched on X")
5. **Cryptographic audit trail** — Every memory operation hash-chained and verifiable
6. **Unified memory across tools** — Same memory layer in Obsidian + Claude Code + Cursor via MCP

## MVP scope (v0.1.0 — ship in 1 week)

**Goal:** Install, connect API key, use 4 commands, feel the difference.

### Commands (all accessible via `Cmd+P`)

1. **Novyx: Remember this note** — Store the current note in persistent memory with semantic tagging. Note content is stored as-is; the memory layer holds the AI's internal representation.
2. **Novyx: Recall** — Prompt-driven recall. Opens a modal, user types a question, plugin calls `nx.recall()` and shows results inline. Lets the user pull context from memory without switching tools.
3. **Novyx: Show Ghost Connections** — For the active note, fetches semantically-connected memories the user never explicitly wiki-linked. Shows them in a sidebar panel with "Convert to wiki-link" buttons.
4. **Novyx: Rollback memory** — Opens a timeline of recent memory changes with rollback buttons.

### Settings tab

- Novyx API key input (stored in Obsidian's encrypted settings)
- API base URL (defaults to `https://novyx-ram-api.fly.dev`)
- "Auto-remember on save" toggle (default: off)
- Ghost Connections sensitivity slider (0.5 - 0.95)
- Link to get a free API key

### What's NOT in v0.1.0

- Full Cortex integration (deferred to v0.2)
- Voice capture (deferred — Vault proper does this better anyway)
- Memory audit trail UI (deferred to v0.2)
- Cross-device sync management (deferred — Novyx Core handles it server-side)
- Policy/governance (deferred — that's for enterprise v0.3+)

Keep the MVP small enough to ship in one week and demonstrate the core value prop.

## Architecture

### Package
- **Repo:** `novyxlabs/novyx-obsidian-plugin`
- **Language:** TypeScript
- **Build:** esbuild (Obsidian standard)
- **License:** MIT
- **Package manager:** npm

### Files
```
novyx-obsidian-plugin/
├── manifest.json           # Obsidian plugin metadata
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── main.ts                 # Plugin entry point
├── src/
│   ├── client.ts           # Novyx API client (reuse pattern from novyx-memory-skill)
│   ├── settings.ts         # Settings tab
│   ├── commands/
│   │   ├── remember.ts
│   │   ├── recall.ts
│   │   ├── ghost-connections.ts
│   │   └── rollback.ts
│   ├── views/
│   │   ├── GhostConnectionsView.ts
│   │   ├── RecallModal.ts
│   │   └── RollbackModal.ts
│   └── types.ts
├── styles.css
├── README.md
└── .github/workflows/release.yml
```

### Dependencies
- `obsidian` (peer)
- No external runtime deps — use raw fetch for API calls (keeps bundle small)

### API surface used (from Novyx Core)
- `POST /v1/memories` (remember)
- `GET /v1/memories/search` (recall)
- `GET /v1/memories/ghost-connections?note_id=X` (Ghost Connections — new endpoint needed?)
- `POST /v1/rollback` (rollback)
- `GET /v1/memories/timeline` (rollback history)

**Blocker to confirm with backend team:** Does a Ghost Connections endpoint exist in Core, or do we call the embedding search endpoint and compute locally?

## Distribution

1. **Obsidian Community Plugins marketplace** — Primary distribution. Submit PR to `obsidianmd/obsidian-releases` after MVP is stable. Approval takes 1-4 weeks.
2. **BRAT (Beta Reviewers Auto-update Tester)** — Interim distribution while waiting for marketplace approval. Users can install directly from the GitHub repo.
3. **Direct install** — Documentation for manual install (clone, npm install, copy to vaults/.obsidian/plugins/).

## Launch plan

1. **Week 1:** Build MVP, dogfood internally against a real Obsidian vault
2. **Week 1, day 7:** Ship to BRAT, post in r/ObsidianMD
3. **Week 2:** Submit to Obsidian Community Plugins marketplace
4. **Week 2:** Create a 60-second demo video showing the Ghost Connections feature specifically (biggest "wow" moment)
5. **Week 3:** Reach out to creators making Obsidian + Claude Code tutorials (Miles Deutscher et al) with free Pro tier — ask them to try the plugin
6. **Week 4+:** v0.2 with Cortex insights + audit trail

## Success metrics

- **v0.1.0 (week 1):** 50 GitHub stars, 100 BRAT installs
- **Month 1:** Marketplace listing approved, 500 installs
- **Month 3:** 2,000 installs, one creator-made tutorial video featuring the plugin
- **Month 6:** 10,000 installs, mentioned in r/ObsidianMD as "actually useful AI plugin"

## Why this is the highest-leverage move

- **Distribution:** 1.5M existing users we don't have to convert — just enhance their existing workflow
- **Feature moat:** Ghost Connections and memory rollback are impossible with DIY. Plugin puts them one keyboard shortcut away.
- **Low cost:** Small TypeScript project, MVP in a week
- **Composable:** Plugin users are natural Vault users too. They can graduate to the full Vault app for the editor, knowledge graph, voice capture, etc.
- **Karpathy alignment:** His pattern is LLM-maintained wiki. The plugin implements that pattern with the memory layer he couldn't build in a markdown file.

## Open questions for Blake

1. **Ghost Connections API** — Does Novyx Core expose a dedicated endpoint, or do we call `search` and filter by similarity threshold client-side?
2. **Naming** — `novyx-obsidian-plugin` or something more user-facing like `novyx-brain` or `obsidian-ai-memory`?
3. **Pricing** — Free plugin entirely, or require a Novyx API key (which has a free tier)? Recommend: plugin is free, requires Novyx API key, free tier gets users started.
4. **Repo location** — Create `novyxlabs/novyx-obsidian-plugin`, or ship it as a subdirectory of `novyx-vault`? Recommend: separate repo so it can be submitted to the Obsidian marketplace cleanly.
