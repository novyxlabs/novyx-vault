<p align="center">
  <img src="docs/hero.png" alt="Novyx Vault" width="800" />
</p>

<h1 align="center">Novyx Vault</h1>

<p align="center">
  <strong>An open-source notes app where your AI actually remembers you.</strong>
</p>

<p align="center">
  <a href="https://vault.novyxlabs.com"><strong>Try it free</strong></a> &nbsp;·&nbsp;
  <a href="https://novyxlabs.com">Website</a> &nbsp;·&nbsp;
  <a href="https://discord.gg/jbef3MJy">Discord</a> &nbsp;·&nbsp;
  <a href="CONTRIBUTING.md">Contributing</a> &nbsp;·&nbsp;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <a href="https://github.com/novyxlabs/novyx-vault/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <a href="https://github.com/novyxlabs/novyx-vault/actions/workflows/ci.yml"><img src="https://github.com/novyxlabs/novyx-vault/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/novyxlabs/novyx-vault/stargazers"><img src="https://img.shields.io/github/stars/novyxlabs/novyx-vault?style=social" alt="GitHub stars"></a>
</p>

---

Markdown notes, wiki-links, a knowledge graph, and a fast editor — like Obsidian. But with an AI assistant that learns your projects, your writing style, and your ideas over time.

Built on [Novyx Core](https://novyxlabs.com) for persistent AI memory.

## Why Novyx Vault?

Every AI assistant starts from zero. Every conversation. You explain your project again, repeat your preferences, lose context the moment you close the tab.

Novyx Vault fixes that. Your AI builds persistent memory from your notes and conversations. The longer you use it, the more useful it becomes.

## How It Compares

| | Novyx Vault | Obsidian | Notion |
|---|---|---|---|
| Markdown files | Yes | Yes | No |
| Wiki-links & backlinks | Yes | Yes | Limited |
| Knowledge graph | Yes | Plugin | No |
| AI with persistent memory | Built in | No | No |
| AI-discovered connections | Built in | No | No |
| Memory rollback & audit | Built in | No | No |
| Voice capture & transcription | Built in | No | No |
| Bring your own AI provider | 20+ | No | No |
| Open source | Yes | No | No |

## Features

### Notes & Editor
- **Markdown Editor** — Fast editor with live preview, syntax highlighting, and keyboard shortcuts. Notes are plain markdown — no proprietary formats, no lock-in.
- **Wiki-Links & Backlinks** — Connect ideas with `[[wiki-links]]`. Every link is bidirectional — backlinks appear automatically.
- **Knowledge Graph** — Interactive force-directed graph of your entire vault. Explore how your ideas connect.
- **Folders, Tags & Search** — Nested folders, inline tags, full-text search. Pin favorites, drag to reorder, filter instantly.

### AI Memory (powered by Novyx Core)
- **Persistent Memory** — Your AI remembers your projects, preferences, and thinking patterns across every session. Ask about something from last month and it responds with full context.
- **Ghost Connections** — AI discovers hidden relationships between your notes — even without shared keywords or explicit links.
- **Memory Timeline & Rollback** — See exactly what your AI remembers and when it learned it. Roll back to any point in time.
- **Cortex Insights** — AI surfaces emerging themes and patterns from your accumulated knowledge.
- **Entity Extraction** — People, projects, and concepts are automatically extracted into a semantic knowledge graph.
- **Audit Trail** — Every memory operation is logged with hash-chain verification. Full transparency into what your AI knows.

### AI Writing Tools
- **Voice Capture** — Record meetings, lectures, or voice memos. Transcribe locally on-device or via cloud. AI structures your transcript into clean markdown notes.
- **Brain Dump** — Paste raw thoughts, get structured notes back.
- **Clip Remix** — Paste web content, get it rewritten in your voice.
- **Slash Commands** — Inline AI help anywhere in the editor.
- **Weekly Review** — Automated summary of your writing activity.
- **Writing Coach** — AI feedback on clarity, structure, and tone.

### BYOK — Bring Your Own Key
- **20+ AI Providers** — OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Together, Mistral, xAI Grok, Perplexity, Cohere, Nvidia NIM, Hyperbolic, Cerebras, SambaNova, Fireworks, Moonshot, MiniMax, OpenRouter, Ollama, LM Studio.
- **Your keys, your browser** — API keys are stored in localStorage only. We never store them on our servers.
- **Switch anytime** — Change providers without losing your memory or notes.

### Local-First & Open Source
- **Desktop App** — Native desktop via Tauri (macOS, Windows, Linux). Notes stored as plain markdown files in `~/SecondBrain/`. No account needed, works offline.
- **Cloud Sync** — Optional Supabase-powered cloud with row-level security for cross-device access, sharing, and publishing.
- **MIT Licensed** — Inspect every line of code, contribute features, or self-host your own instance.

---

## Quick Start

### Use it now (no install)

**[vault.novyxlabs.com](https://vault.novyxlabs.com)** — sign in with GitHub or Google. Free.

### Self-host / Desktop Mode

Desktop mode stores notes as plain markdown files in `~/SecondBrain/`. No database, no account.

```bash
git clone https://github.com/novyxlabs/novyx-vault.git
cd novyx-vault
npm install
```

Create `.env.local`:

```env
NOVYX_MEMORY_API_KEY=your_novyx_api_key
```

Get a free API key at [novyxlabs.com](https://novyxlabs.com).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Desktop App (Tauri)

```bash
npm run tauri:dev    # development with hot reload
npm run tauri:build  # production build
```

Requires [Rust](https://rustup.rs/).

---

## Cloud Deployment

Cloud mode adds auth, cross-device sync, sharing, and publishing via Supabase.

### 1. Set up Supabase

Create a project at [supabase.com](https://supabase.com). Required tables (`profiles`, `notes`, `note_versions`) use row-level security.

### 2. Environment Variables

```env
# Storage
STORAGE_MODE=supabase

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Novyx AI Memory
NOVYX_MEMORY_API_KEY=your_novyx_api_key
NOVYX_ADMIN_KEY=your_novyx_admin_key

# Rate Limiting (optional, recommended for production)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 3. Deploy

```bash
npm run build
```

Or connect your GitHub repo to [Vercel](https://vercel.com) for automatic deployments.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_MODE` | Cloud only | Set to `supabase` for cloud mode. Leave empty for desktop. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cloud only | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cloud only | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloud only | Server-side Supabase key. **Never expose to client.** |
| `NOVYX_MEMORY_API_KEY` | Desktop | Personal Novyx API key. In cloud mode, users get keys via provisioning. |
| `NOVYX_ADMIN_KEY` | Cloud only | Admin key for provisioning per-user Novyx keys on signup |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis auth token |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Playwright E2E tests |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run tauri:dev` | Tauri desktop development |
| `npm run tauri:build` | Build Tauri desktop app |

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · CodeMirror 6 · Novyx SDK · Supabase · Tauri v2

**52 components · 64 API routes · 20+ AI providers**

## Project Structure

```
app/              Next.js app router (pages + API routes)
components/       React components (52 components)
lib/              Storage adapters, Novyx client, providers, transcription
public/           Static assets
src-tauri/        Tauri desktop app (Rust)
tests/            Playwright E2E + Vitest unit tests
```

---

## Novyx Core

Novyx Vault's AI memory is powered by the [Novyx SDK](https://novyxlabs.com). The free tier includes everything you need to get started. Pro unlocks higher limits.

**What Novyx Core does:**

- **Remember** — Store context from conversations and notes
- **Recall** — Retrieve relevant memories for AI responses
- **Cortex** — Surface emerging themes across your knowledge
- **Audit** — Hash-chained audit trail for every memory operation
- **Rollback** — Travel back to any previous memory state
- **Entities & Triples** — Semantic knowledge graph extraction

Get a free API key at [novyxlabs.com](https://novyxlabs.com).

---

## MCP Integration

Novyx Vault works alongside `novyx-mcp` to give AI agents persistent memory across any MCP-compatible tool.

### Setup

```bash
npm install -g novyx-mcp
```

Add to your Claude Desktop config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "novyx-memory": {
      "command": "novyx-mcp",
      "env": {
        "NOVYX_API_KEY": "your-api-key"
      }
    }
  }
}
```

Works with Claude Code, Cursor, Windsurf, or any MCP-compatible client.

### How it works

1. **Your agent stores memories** as it works — project context, preferences, decisions
2. **Open Vault** to view, search, and manage those memories visually
3. **Audit trail** shows every operation with hash-chain verification
4. **Rollback** to any previous memory state if needed

The same Novyx API key works across Vault, MCP, and the SDK. Memories created anywhere appear everywhere.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/novyxlabs/novyx-vault.git
cd novyx-vault
npm install
npm run dev
```

<a href="https://github.com/novyxlabs/novyx-vault/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=novyxlabs/novyx-vault" alt="Contributors" />
</a>

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://novyxlabs.com">Novyx Labs</a>
</p>
