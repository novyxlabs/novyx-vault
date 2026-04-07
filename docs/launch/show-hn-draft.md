# Show HN Draft

## Title
Show HN: Novyx Vault – Open-source notes app with AI that remembers across sessions

## Body

I built an open-source second brain where the AI builds persistent memory — not just RAG over your files.

**The problem:** Every AI notes app (Notion AI, Obsidian + plugins, Reflect, Mem) does the same thing: vector search over your documents when you ask a question. Close the tab, and the AI starts fresh. It doesn't remember your preferences, your past decisions, or the context from last week's conversation.

**What Vault does differently:**

The AI maintains a separate memory layer (powered by Novyx Core) that persists across sessions. It remembers things you mentioned in conversation, consolidates knowledge over time, and surfaces patterns you haven't noticed. If the AI learns something wrong, you can roll it back to any point in time.

Think of it as: Obsidian's markdown + wiki-links + knowledge graph, but with an AI that has actual long-term memory.

**Features:**
- Persistent AI memory with timeline, rollback, and audit trail
- Ghost Connections: AI discovers hidden links between notes (no shared keywords needed)
- Markdown files, wiki-links, bidirectional backlinks, knowledge graph
- 20+ AI providers via BYOK (OpenAI, Anthropic, Gemini, DeepSeek, Ollama, etc.)
- Voice capture with on-device transcription
- Desktop app (Tauri — macOS/Windows/Linux) or cloud (Next.js + Supabase)
- Import your existing Obsidian vault
- MIT licensed

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind 4, CodeMirror 6, Tauri v2, Supabase, Novyx SDK

**Try it:** https://vault.novyxlabs.com (free, no credit card)
**Source:** https://github.com/novyxlabs/novyx-vault
**Self-host:** Clone, npm install, npm run dev

I'm a solo founder building this in public. The memory infrastructure (Novyx Core) is also open source — it works with Claude Code and Cursor via MCP, so the same memory layer spans your notes and your coding tools.

Happy to answer questions about the architecture, the memory system, or the business model.
