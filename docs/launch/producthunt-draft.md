# Product Hunt Launch Draft

## Tagline (60 chars max)
Open-source notes app with AI that remembers across sessions

## Description

Every AI notes app does the same thing: search your files when you ask a question. Close the session, and the AI forgets everything.

Novyx Vault is the first open-source second brain where your AI builds persistent memory. It remembers your projects, preferences, and decisions across every session — and it gets smarter over time.

**What makes it different:**

- Persistent AI memory that survives sessions, restarts, and tab closes
- Memory timeline with point-in-time rollback (undo what your AI learned)
- Ghost Connections — AI discovers hidden links between notes without shared keywords
- Bring your own AI key — 20+ providers (OpenAI, Anthropic, Gemini, DeepSeek, Ollama, etc.)
- Markdown files, wiki-links, knowledge graph, voice capture
- Desktop app (Tauri) or cloud — your data, your choice
- MIT licensed, fully open source

**How it compares:**
- vs Obsidian: Vault adds persistent AI memory and ghost connections. Import your existing vault.
- vs Notion AI: Vault is open source, local-first, and your AI actually remembers you.
- vs Mem: No VC-funded pricing surprises. Open source. You own your data.

Try it free at vault.novyxlabs.com — or self-host from GitHub.

## Maker's First Comment

Hey PH! I'm Blake, solo founder of Novyx Labs.

I built Vault because I was tired of re-explaining my projects to AI every session. I use Claude Code and Cursor daily — they're great, but they forget everything. Notes apps with AI "search" your files, but that's retrieval, not memory.

Vault is different: the AI builds actual memory from your notes and conversations. Yesterday I asked it about a database schema decision I made three weeks ago. It knew. Not because I wrote it in a note — because it remembered our conversation.

The memory layer is powered by Novyx Core (our open-source AI memory infrastructure). Same memory works across Vault, Claude Code, and Cursor via MCP.

Some details:
- 53 components, 65 API routes, 20+ AI providers
- Tauri desktop app (macOS/Windows/Linux) — works fully offline
- Obsidian import preserves all wiki-links
- MIT licensed — inspect every line, self-host, contribute

I'd love your feedback. What would make you switch from your current setup?

## Topics/Categories
- Productivity
- Artificial Intelligence
- Open Source
- Developer Tools
- Note Taking

## Media needed
- [ ] Hero image/screenshot
- [ ] 90-second demo video showing memory persistence
- [ ] Gallery screenshots (editor, knowledge graph, memory timeline, ghost connections)
