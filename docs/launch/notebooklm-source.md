# Novyx Vault — The Only Open-Source Second Brain With Persistent AI Memory

## What It Is

Novyx Vault is an open-source notes app (like Obsidian or Notion) where the AI assistant has persistent memory that survives across sessions. Most AI notes apps rely on RAG — searching your files when you ask a question. Some, like Notion Agents, have added lightweight preference persistence (a self-updating instructions page), and Tana's knowledge graph gives AI structured context. But none of them offer deep episodic memory that evolves autonomously, consolidates over time, and can be inspected or rolled back. That's what Vault does.

## The Problem It Solves

Most AI notes apps rely on vector search over your documents. Notion has moved beyond pure RAG — their Agents (3.0) maintain a persistent instructions page and learn preferences over time — but it's closer to a self-updating system prompt than true memory. The AI can't independently decide what to remember, connect experiences across sessions, or let you roll back what it learned. Obsidian's ecosystem now supports MCP-based memory via third-party servers, but it's bolted on, not native. Reflect, Mem, Capacities, and Heptabase remain RAG-based with no persistent memory layer.

The result for most users:
- You re-explain context to the AI frequently, even if it has basic preference persistence
- The AI can't connect decisions across sessions or surface patterns over time
- There's no way to inspect, audit, or undo what the AI "knows"

## How Vault Is Different

Vault has a separate persistent memory layer powered by Novyx Core (open-source AI memory infrastructure). This means:

1. **Cross-session memory**: Tell the AI about your project once. It remembers next week, next month. Ask about a decision you discussed three weeks ago and it responds with full context — not because you wrote it in a note, but because it remembered your conversation.

2. **Ghost Connections**: The AI discovers hidden relationships between your notes that you didn't explicitly link. No shared keywords needed — it finds semantic connections you missed.

3. **Memory Timeline and Rollback**: You can see exactly what your AI learned and when. If it learned something wrong or you want to undo a batch of memories, roll back to any point in time. Like git for your AI's brain.

4. **Cortex Insights**: The AI surfaces emerging themes and patterns from your accumulated knowledge. It notices what you're thinking about before you do.

5. **Audit Trail**: Every memory operation is logged with SHA-256 hash-chain verification. Full transparency into what your AI knows.

## The Notes App Part

Everything you'd expect from a modern second brain:
- Markdown files with live preview (CodeMirror 6 editor)
- Wiki-links with bidirectional backlinks
- Interactive knowledge graph (force-directed)
- Folders, tags, full-text search, pinned favorites
- Voice capture with on-device Whisper transcription
- Brain dump (paste raw thoughts, get structured notes)
- Writing coach, weekly review, slash commands

## 20+ AI Providers

Bring Your Own Key: OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Together, Mistral, xAI Grok, Perplexity, Cohere, Ollama, LM Studio, and more. Your API keys stay in your browser — never stored on servers. Switch providers without losing your memory or notes.

## Local-First and Open Source

- Desktop app via Tauri (macOS, Windows, Linux) — notes stored as plain markdown files in ~/SecondBrain/
- Works fully offline, no account needed
- Optional cloud sync via Supabase with cross-device access
- MIT licensed — inspect, contribute, or self-host your own instance
- Import your existing Obsidian vault with one click

## How It Compares

| Feature | Novyx Vault | Obsidian | Notion | Reflect |
|---|---|---|---|---|
| AI remembers across sessions | Deep episodic memory | No | Basic preference persistence | No |
| Memory rollback & audit trail | Built in | No | Page history only | No |
| AI discovers hidden connections | Built in (Ghost Connections) | No | No | No |
| Bring your own AI provider | 20+ providers | Plugin-dependent | No (locked to Notion's models) | 3+ models (GPT-4o, Claude, Gemini) |
| Open source | MIT | Source-available | No | No |
| Local-first / offline | Yes (Tauri desktop) | Yes | No | No |

## Market Context

The AI note-taking market is $623 million in 2025, growing to $3.48 billion by 2035. Major players include Notion (100M+ users), Obsidian (1.5M users, commercial use now free), Reflect ($3.75M seed from a16z), Mem ($29.1M raised, no new funding since 2022), and Tana ($25M raised, now generally available). Notion has the closest thing to persistent memory with their Agent instructions page, but none offer the depth of autonomous episodic memory, rollback, and audit that Vault ships.

Andrej Karpathy recently described his "LLM Knowledge Base" workflow — using an LLM to compile and maintain a wiki from raw source documents. His key insight: "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping. LLMs handle the bookkeeping." Vault implements that vision but adds persistent memory, rollback, and zero setup.

## The MCP Connection

The same Novyx memory layer works across Vault, Claude Code, and Cursor via the Model Context Protocol (MCP). Install novyx-mcp and your coding agent shares memory with your notes app. Memories created in Claude Code appear in Vault. Context from Vault is available to your coding assistant. One memory, everywhere.

## Who Built It

Blake Heron, solo founder of Novyx Labs. Bootstrapped, building in public. The memory infrastructure (Novyx Core) powers both Vault and the MCP server. 119 MCP tools, 185+ API endpoints, 6,500+ PyPI downloads.

## Try It

- Web: vault.novyxlabs.com (free, no credit card)
- Self-host: git clone, npm install, npm run dev
- Docker: docker run -p 3000:3000 ghcr.io/novyxlabs/novyx-vault
- Desktop: Tauri app for macOS/Windows/Linux
- Source: github.com/novyxlabs/novyx-vault (MIT)
