# AI Agent Memory

## The Problem
Every AI assistant starts from zero every session. You re-explain your project, your preferences, your constraints. Conversations are disposable. Nothing compounds.

## RAG vs Persistent Memory
- **RAG**: Vector search over your documents at query time. Rediscovers knowledge from scratch on every question. No accumulation.
- **Persistent memory**: AI maintains an independent memory layer that evolves over time. Remembers preferences, decisions, context from past sessions. Consolidates and connects.

## Key Papers
- Karpathy's LLM Knowledge Base pattern (April 2026) — wiki compiled from raw sources
- Mem0's memory extraction pipeline — 80% prompt token reduction claim
- MemGPT/Letta — virtual context management with tiered memory

## Our Approach
Novyx Core provides the memory layer. Key properties:
1. Memory persists independently of documents
2. Point-in-time rollback (like git for AI state)
3. Cryptographic audit trail (SHA-256 hash chain)
4. Cross-tool: same memory in [[Vault Roadmap|Vault]], Claude Code, Cursor via MCP

## Competitors
- Mem0: memory layer, no notes UI
- Khoj: retrieval assistant, no memory persistence
- Graphify: one-shot compiler, no evolution
- NoteGen: similar surface to Vault, no memory layer
