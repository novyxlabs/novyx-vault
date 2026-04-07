# Reddit Launch Drafts

## r/ObsidianMD

**Title:** I built an open-source Obsidian alternative with persistent AI memory — imports your vault

**Body:**

I've been an Obsidian user for years. Love the markdown, wiki-links, and knowledge graph. But I kept running into the same problem: every AI plugin starts from scratch each session. Smart Connections and Copilot are great for searching your vault, but the AI never actually *remembers* your projects or preferences.

So I built Novyx Vault — an open-source (MIT) second brain that keeps everything Obsidian does well (markdown files, `[[wiki-links]]`, force-directed graph, folders/tags) and adds persistent AI memory.

**What "persistent memory" means in practice:**
- You tell the AI about your project once. It remembers next week.
- It discovers connections between notes you didn't explicitly link (Ghost Connections).
- If the AI learns something wrong, you can roll it back to any point in time.
- Full audit trail — see exactly what your AI knows and when it learned it.

**Other differences:**
- 20+ AI providers via BYOK (OpenAI, Anthropic, Gemini, DeepSeek, Ollama, etc.)
- Voice capture with on-device transcription
- Desktop app (Tauri) — works offline, stores files as plain markdown in `~/SecondBrain/`
- Cloud mode with cross-device sync if you want it
- MIT licensed, fully open source

**Obsidian import:** Settings → Import → Obsidian → select your vault folder. Wiki-links preserved.

Try it: [vault.novyxlabs.com](https://vault.novyxlabs.com) (free, no credit card)
Source: [github.com/novyxlabs/novyx-vault](https://github.com/novyxlabs/novyx-vault)

Happy to answer questions about the architecture or what "persistent memory" means technically — it's built on a separate memory infrastructure called Novyx Core that also works with Claude Code and Cursor via MCP.

---

## r/selfhosted

**Title:** Novyx Vault — open-source self-hosted notes app with AI that remembers across sessions (Next.js + Tauri)

**Body:**

Just open-sourced my second brain app. It's a markdown notes app (wiki-links, knowledge graph, folders/tags) with an AI assistant that has persistent memory — it actually remembers your projects and preferences across sessions instead of starting from scratch.

**Self-hosting:**

```bash
git clone https://github.com/novyxlabs/novyx-vault.git
cd novyx-vault
npm install && npm run dev
```

Or Docker:

```bash
docker run -p 3000:3000 ghcr.io/novyxlabs/novyx-vault
```

**Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, CodeMirror 6, Tauri v2 (desktop)

**Storage:** Two modes:
- **Desktop/local:** Plain markdown files in `~/SecondBrain/`. No database needed.
- **Cloud:** Supabase (Postgres + auth + row-level security). Self-host your own Supabase instance for full control.

**AI:** BYOK with 20+ providers (OpenAI, Anthropic, Gemini, Ollama, LM Studio, etc.). Keys stay in your browser, never stored server-side.

**What makes it different from other self-hosted note apps:**
- Persistent AI memory (remembers across sessions, not just RAG over files)
- Memory rollback — undo what the AI learned at any point
- Ghost Connections — AI discovers hidden relationships between notes
- Voice capture with on-device Whisper transcription

MIT licensed. No telemetry in self-hosted mode (Plausible only on the hosted version).

Source: [github.com/novyxlabs/novyx-vault](https://github.com/novyxlabs/novyx-vault)

---

## r/ArtificialIntelligence

**Title:** Every AI notes app does RAG. I built one with actual persistent memory.

**Body:**

I got frustrated that every "AI notes app" does the same thing: vector search over your documents when you ask a question. Notion AI, Obsidian plugins, Reflect, Mem — they all call it "memory" but it's just retrieval. Close the session, the AI forgets everything.

I built Novyx Vault — an open-source second brain where the AI has actual persistent memory. Here's the difference:

**RAG (what everyone does):** You write a note → AI can search it later → but the AI has no independent memory. It only knows what's in your files, and it "forgets" between sessions.

**Persistent memory (what Vault does):** The AI maintains a separate memory layer that persists across sessions. It remembers your preferences, project context, and past decisions — even things you mentioned in conversation but didn't write into a note. Memory consolidates over time and can be rolled back to any point.

**Concrete example:** Three weeks ago I told my AI about a database schema decision. Yesterday I asked about it. It remembered — not because I wrote it in a note, but because it stored the context from our conversation.

**Technical details:**
- Memory powered by Novyx Core (separate memory infrastructure with rollback, audit trails, knowledge graph)
- Same memory layer works across Vault, Claude Code, and Cursor via MCP
- 20+ AI providers via BYOK (your keys, your browser)
- MIT open source, self-hostable

The underlying premise: as AI agents get more capable, the ability to *remember and learn* across sessions becomes more important than the ability to *search your files*. RAG was step one. Persistent memory is step two.

Try it: [vault.novyxlabs.com](https://vault.novyxlabs.com)
Source: [github.com/novyxlabs/novyx-vault](https://github.com/novyxlabs/novyx-vault)

---

## r/pkm (Personal Knowledge Management)

**Title:** Built an open-source second brain where the AI gets smarter over time — not just search

**Body:**

I've been deep in the PKM space for years (Obsidian, Notion, Logseq). The AI integrations in all of them do the same thing: search your notes when you ask a question. It's useful, but it's not *memory*.

Novyx Vault takes a different approach. Instead of just searching your files, the AI builds a persistent memory layer that evolves over time:

- **It remembers across sessions.** Tell it about your project once. It knows next week.
- **Ghost Connections.** The AI finds relationships between notes you didn't explicitly link — no shared keywords needed.
- **Memory timeline.** See exactly when the AI learned each thing, and roll back to any point if it went wrong.
- **Cortex insights.** AI surfaces emerging themes across your accumulated knowledge.

Everything you'd expect from a PKM tool is there: markdown files, `[[wiki-links]]`, bidirectional backlinks, knowledge graph, folders, tags, full-text search. Plus voice capture, brain dump, writing coach, and 20+ AI providers via BYOK.

Open source (MIT), self-hostable, desktop app via Tauri. Imports Obsidian vaults.

I'm not claiming this replaces Obsidian for everyone. If you love the plugin ecosystem, nothing touches it. But if you want AI that actually learns your knowledge over time instead of just searching it, this might be interesting.

[vault.novyxlabs.com](https://vault.novyxlabs.com) | [GitHub](https://github.com/novyxlabs/novyx-vault)
