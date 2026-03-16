# Novyx Vault

**An open-source AI workspace with persistent memory.**

Your notes, your AI's memory, and cryptographic proof that nothing was lost or changed. Write in markdown, link ideas with wiki-style connections, and let AI surface relationships you never knew existed.

Built on [Novyx Core](https://novyx.ai) for persistent AI memory.

**[Try it free →](https://vault.novyxlabs.com)**

<p align="center">
  <img src="docs/hero.png" alt="Novyx Vault" width="800" />
</p>

---

## Features

- **Persistent AI Memory** — AI remembers your projects, preferences, and thinking patterns across every session. The more you use it, the smarter it gets.
- **Memory Rollback & Timeline** — Travel back through your AI's memory. Undo accidental context, restore previous states, see exactly how your AI's understanding evolved.
- **Ghost Connections** — AI discovers hidden relationships between your notes — even without shared keywords or explicit links.
- **Knowledge Graph** — Interactive force-directed graph of your entire vault. See how your ideas connect and navigate visually.
- **Cortex Insights** — AI surfaces emerging themes and patterns from your accumulated knowledge.
- **Entity Extraction** — People, projects, and concepts are automatically extracted into a semantic knowledge graph.
- **Wiki-Style Linking** — Connect ideas with `[[wiki-links]]` and automatic bidirectional backlinks.
- **Bring Your Own AI** — Works with 13+ providers: OpenAI, Anthropic, DeepSeek, Ollama, LM Studio, Groq, Together, Mistral, Gemini, Cerebras, SambaNova, Moonshot, MiniMax.
- **AI Writing Tools** — Brain Dump (raw thoughts → structured notes), Clip Remix (rewrite in your voice), slash commands, Weekly Review.
- **Local-First** — Notes are plain markdown files on your machine. No lock-in, no proprietary formats.
- **Cloud Sync** — Optional Supabase-powered cloud with row-level security for cross-device access.
- **Desktop App** — Native desktop via Tauri (macOS, Windows, Linux).

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · CodeMirror 6 · Novyx SDK · Supabase · Tauri v2

---

## Quick Start (Desktop Mode)

Desktop mode stores notes as plain markdown files in `~/SecondBrain/`. No database, no account required.

```bash
git clone https://github.com/novyxlabs/novyx-vault.git
cd novyx-vault
npm install
```

Create `.env.local`:

```env
# Only required variable for desktop mode
NOVYX_MEMORY_API_KEY=your_novyx_api_key
```

Get a free Novyx API key at [novyxlabs.com](https://novyxlabs.com).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Desktop App (Tauri)

```bash
npm run tauri:dev    # development with hot reload
npm run tauri:build  # production build (macOS, Windows, Linux)
```

Requires [Rust](https://rustup.rs/) installed.

---

## Cloud Deployment (Supabase)

Cloud mode uses Supabase for storage, auth, and cross-device sync.

### 1. Set up Supabase

Create a project at [supabase.com](https://supabase.com). The required tables (`profiles`, `notes`, `note_versions`) use row-level security.

### 2. Environment Variables

```env
# Storage mode
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

### 3. Deploy to Vercel

```bash
npm run build
```

Or connect your GitHub repo to [Vercel](https://vercel.com) for automatic deployments.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_MODE` | Cloud only | Set to `supabase` for cloud mode. Leave empty for desktop. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cloud only | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cloud only | Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloud only | Server-side Supabase key for provisioning. **Never expose to client.** |
| `NOVYX_MEMORY_API_KEY` | Desktop | Personal Novyx API key. In cloud mode, users get individual keys via provisioning. |
| `NOVYX_ADMIN_KEY` | Cloud only | Admin key for provisioning per-user Novyx keys on signup |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis endpoint for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis auth token |
| `TEST_ANTHROPIC_API_KEY` | Testing only | Anthropic key for E2E tests |

---

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

---

## Project Structure

```
app/              Next.js app router (pages + API routes)
components/       React components (34 components)
lib/              Storage adapters, Novyx client, markdown plugins, search
public/           Static assets
src-tauri/        Tauri desktop app (Rust)
seo/              SEO content calendar
tests/            Playwright E2E + Vitest unit tests
```

---

## Novyx Core

Novyx Vault's persistent AI memory is powered by the [Novyx SDK](https://novyxlabs.com). Novyx Core provides:

- **Remember** — Store memories from conversations and notes
- **Recall** — Retrieve relevant context for AI responses
- **Cortex** — Surface emerging themes across your knowledge
- **Drift** — Track how your AI's understanding evolves over time
- **Entities & Triples** — Semantic knowledge graph extraction

Get an API key at [novyx.ai](https://novyx.ai).

---

## MCP Integration

Novyx Vault works alongside `novyx-mcp` to give your AI agents persistent memory across any MCP-compatible tool.

### Setup

Install the MCP server globally:

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

Works the same way in Cursor, Windsurf, or any MCP-compatible client.

### How it works

1. **Your agent stores memories** as it works — project context, preferences, code patterns
2. **Open Vault** to view, search, and manage those memories in a visual dashboard
3. **Audit trail** shows every operation with hash-chain verification
4. **Rollback** to any previous memory state if needed

The same Novyx API key works across Vault, MCP, and the Novyx SDK directly. Memories created via MCP appear in Vault automatically.

---

## Contributing

Novyx Vault is open source. Contributions are welcome.

```bash
git clone https://github.com/novyxlabs/novyx-vault.git
cd novyx-vault
npm install
npm run dev
```

---

## License

MIT

---

Built by [Novyx Labs](https://novyxlabs.com)
