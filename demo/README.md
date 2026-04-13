# Demo Video Recording

Automated demo recording for Novyx Vault using Playwright. Produces a 1080p screen recording of the real app showing the key moments: vault exploration, knowledge graph, memory persistence, rollback, and wiki-link navigation.

## Prerequisites

- Node.js 22+
- Playwright (`npx playwright install chromium`)
- A Novyx API key ([get one free](https://novyxlabs.com))
- ffmpeg (optional, for MP4 conversion: `brew install ffmpeg`)

## Quick start

```bash
# 1. Set your API key
export NOVYX_MEMORY_API_KEY=your_key

# 2. Run the setup (copies seed notes + stores memories)
bash demo/scripts/setup.sh

# 3. Start the dev server (in another terminal)
NOVYX_MEMORY_API_KEY=$NOVYX_MEMORY_API_KEY npm run dev

# 4. Record the demo (opens a visible browser)
npx playwright test demo/scripts/record-demo.spec.ts --headed

# 5. Convert to MP4 (optional)
bash demo/scripts/add-captions.sh test-results/*/video.webm demo/output/demo.mp4
```

The raw recording lands in `test-results/`. The conversion script outputs to `demo/output/`.

## What the demo shows

| Scene | Duration | What happens |
|-------|----------|-------------|
| 1. The vault | ~10s | Sidebar with folders, open a note, scroll through content |
| 2. Knowledge graph | ~8s | Interactive node graph of all notes and their connections |
| 3. Memory + governance | ~17s | Mission Control dashboard with stats and activity |
| 4. Memory rollback | ~15s | Memory list showing what the AI knows, timeline view |
| 5. Research depth | ~20s | Wiki-links, note navigation, cross-referencing |
| 6. End beat | ~10s | Final look at the vault |

Total: ~80 seconds.

## Seed data

**Notes** (`demo/seed-notes/`): 7 markdown files organized in 3 folders (Projects, Research, Journal). Content simulates a technical founder's vault with real decisions, research notes, and daily journal entries. Wiki-links connect notes to each other.

**Memories** (`demo/scripts/seed-memories.ts`): 9 memories stored via the Novyx API. Includes project decisions (CodeMirror choice, Supabase choice, schema decisions), research context (Karpathy, Mem0), personal preferences, and one intentionally "outdated" memory (the Graphify competitor assessment) that demonstrates why rollback matters.

## Post-production

The raw Playwright recording is usable as-is but benefits from:

1. **Title card** — "Novyx Vault — your AI actually remembers"
2. **Captions** — see `demo/captions.txt` for scene-by-scene text
3. **Background music** — royalty-free, low volume (try [Pixabay](https://pixabay.com/music/))
4. **End card** — vault.novyxlabs.com + github.com/novyxlabs/novyx-vault

Use iMovie (fast), DaVinci Resolve (free, more control), or CapCut (if you want AI captions).

## Re-recording

The demo is fully repeatable. If the UI changes:

1. Update the seed notes in `demo/seed-notes/` if needed
2. Re-run `bash demo/scripts/setup.sh` to refresh
3. Re-run the recording: `npx playwright test demo/scripts/record-demo.spec.ts --headed`

The Playwright script uses resilient selectors (text content, title attributes) so minor UI changes won't break it. If a major restructure happens, update the selectors in `record-demo.spec.ts`.

## Files

```
demo/
├── README.md                       # This file
├── captions.txt                    # Scene-by-scene caption text
├── seed-notes/                     # Markdown files for the demo vault
│   ├── Projects/
│   │   ├── Vault Roadmap.md
│   │   ├── Database Schema.md
│   │   └── Performance Notes.md
│   ├── Research/
│   │   ├── AI Agent Memory.md
│   │   └── Karpathy LLM Wiki.md
│   └── Journal/
│       ├── 2026-04-01.md
│       └── 2026-04-10.md
├── scripts/
│   ├── setup.sh                    # One-command setup
│   ├── seed-memories.ts            # Store demo memories via API
│   ├── record-demo.spec.ts         # Playwright recording script
│   └── add-captions.sh             # WebM → MP4 conversion
└── output/                         # Generated videos (gitignored)
```
