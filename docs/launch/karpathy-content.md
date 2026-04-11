# Karpathy LLM Knowledge Base — content drafts

Two pieces of content for the inbound traffic push around Karpathy's LLM Knowledge Base post. Both reference his framework genuinely (no hijacking) and point at `/compare/knowledge-base` as the destination page.

---

## X / Twitter thread (10 posts)

**Post 1 / hook**

Andrej Karpathy quietly described the most interesting AI workflow of 2026 in a single gist. His "LLM Knowledge Base" pattern has 16M+ views. Almost nobody has built it correctly. Here's what he said and where most implementations go wrong. 🧵

**Post 2**

The pattern: keep a folder of raw source documents (papers, articles, screenshots). An LLM compiles them into a structured wiki with interlinked markdown pages. New sources don't get filed away — they update existing pages, revise summaries, flag contradictions.

**Post 3**

His exact words: "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping. LLMs handle the bookkeeping."

This is the right framing. The bottleneck isn't search. It's organization. RAG just rediscovers everything from scratch every query.

**Post 4**

Most "AI second brain" tutorials you'll see point at Obsidian + Claude Code + a system prompt. That works. It's also fragile in three specific ways most people don't realize until month 2.

**Post 5**

Fragility #1: the wiki is just markdown files. Every Claude Code session re-reads them from scratch. Whatever the AI learned in the last conversation but didn't write into a file is gone.

The "memory" is your filesystem. The AI has no independent memory.

**Post 6**

Fragility #2: there's no rollback. If the AI mis-ingests an article and corrupts a page, you have `git diff` at best. No timeline. No way to ask "what did the AI know about X three weeks ago?"

For a knowledge base, time-travel is table stakes.

**Post 7**

Fragility #3: there's no audit. You can't see what the AI considered authoritative when it made a claim. Karpathy's whole framework relies on the LLM being an honest librarian. Honest librarians keep a log.

**Post 8**

We've been building this exact pattern for 18 months at @novyxlabs. Persistent memory layer (not just files), point-in-time rollback (real git for AI brain), cryptographic audit chain. Same memory shared across Vault, Claude Code, Cursor via MCP.

**Post 9**

Karpathy's pattern + the three things it's missing:
→ vault.novyxlabs.com/compare/knowledge-base

It's open source (MIT), self-hostable, and it works with your existing Obsidian vault (we just shipped a plugin too — `novyx` in the marketplace).

**Post 10**

Building on Karpathy's framework, not against it. He nailed the diagnosis. We tried to ship the antidote.

If you're already running his pattern with Claude Code + Obsidian, swap in our memory layer and see the difference in a week. If you're not, start there and add memory when you feel the need for rollback.

---

## Blog post (long form)

**Title:** Karpathy's LLM Knowledge Base, but the AI actually remembers

**Slug:** `karpathy-llm-knowledge-base-with-memory`

**Suggested location:** `novyx-site` blog (or as standalone Medium/dev.to post for inbound SEO)

**Meta description:** Andrej Karpathy described the LLM-maintained wiki pattern that got 16M views. Here's the three things it's missing — and how to add them.

---

In April 2026, Andrej Karpathy posted a gist describing his personal knowledge base workflow. It got over 16 million views in 48 hours, spawned dozens of "I built this" tutorials, and validated something a lot of us had been quietly building: the era of personal LLM-managed knowledge.

The pattern he described is elegant. Three layers:

1. **Raw sources** — an immutable folder of original documents: papers, articles, screenshots, web clippings. You add to it. You never edit it.
2. **The wiki** — LLM-owned markdown pages that interlink, summarize, and synthesize the raw sources into navigable knowledge.
3. **The schema** — a `CLAUDE.md`-style configuration that defines how the LLM should organize, link, and maintain the wiki.

Three operations:

- **Ingest** — a new raw source touches 10–15 wiki pages, updating summaries, adding cross-references, flagging contradictions.
- **Query** — synthesize an answer from the wiki with citations back to raw sources.
- **Lint** — find orphan pages, contradictions, gaps.

Karpathy's quote that defined the moment:

> "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping. LLMs handle the bookkeeping."

He's right. And the response was immediate — within 48 hours people were building this with Claude Code and Obsidian, posting screen recordings, writing 22-minute setup tutorials. The pattern is provably useful.

But after building this exact pattern at Novyx for the last 18 months, we've watched users hit the same three walls. Not in the first session, not in the first week, but reliably by month two. They're not Karpathy's fault — his framework is sound. They're what's missing from the framework when you take it from "personal experiment" to "thing I depend on every day".

## Wall #1: The wiki is just markdown files

In the standard Karpathy + Claude Code setup, your wiki is a folder of `.md` files. Every new Claude Code session reads them from scratch. The "memory" is your filesystem.

This is fine until you mention something to the AI in conversation that you don't write into a file. Maybe you said "I think we should pause the React rewrite — the bundler regression isn't worth it" while reviewing code. The AI agreed. You moved on.

Three weeks later you start a new session and ask the AI about the React rewrite. It starts pitching you on resuming it. Why? Because the conversation where you decided to pause it isn't in the wiki. It was in chat. Chats are ephemeral. Files are eternal. Anything that didn't make it into a file is lost.

This isn't a bug in Karpathy's pattern — it's a structural property of file-based memory. The fix is to have a memory layer that lives independently of the document layer. Things that get said in conversation get remembered, even if they never get written down.

## Wall #2: No rollback

You're a few months into your wiki. The AI has been ingesting articles for you. One morning you open it up and notice that several pages on a topic you care about contain factual errors. Where did they come from? When were they introduced? You don't know.

You can `git log` your wiki and find the commits. You can `git diff` and see the textual changes. But you can't ask "what did the AI consider authoritative about this topic on March 1st?" The state is gone.

For a personal knowledge base this is annoying. For a research workflow it's a non-starter. Karpathy explicitly mentioned wanting his wiki to outlive him as a thinking record. A thinking record without time-travel is just a snapshot.

The fix is point-in-time rollback at the memory layer — not file-level versioning, but semantic versioning of what the AI knew at each point. Like git, but for your AI's brain.

## Wall #3: No audit chain

Karpathy's framework assumes the LLM is an honest librarian. It reads sources, extracts claims, attaches citations. You can verify by clicking through to the raw source.

But you can't verify *why* the LLM organized the wiki the way it did. You can't inspect what the LLM considered authoritative when it merged two articles into a single summary. You can't prove that a claim in your wiki actually came from the source it cites and not from the LLM's training data.

For a personal experiment, this is fine — you trust the LLM and move on. For anything you'd cite in a paper, anything you'd build a business decision on, anything you'd defend in court, the absence of an audit chain is the absence of trust.

The fix is cryptographic hash-chain audit. Every memory operation logged. Every claim traceable to its source and to the moment it was added.

## What we built

[Novyx Vault](https://vault.novyxlabs.com) is the open-source second brain we built around exactly this insight. The Karpathy pattern is the right pattern. Markdown, wiki-links, knowledge graphs — all of it. We just added the three things the file-only version can't have:

- **Persistent AI memory** that lives independently of your files
- **Point-in-time rollback** for memory state, not just file content
- **Cryptographic audit trail** for every memory operation

The same memory layer works across Vault, Claude Code, and Cursor via MCP. Your decisions while coding show up in your notes app. Your wiki context is available to your coding agent. One memory, everywhere.

If you're already running the Karpathy pattern with Claude Code and Obsidian, you don't have to abandon any of it. We just shipped an [Obsidian plugin](https://github.com/novyxlabs/novyx-obsidian) that adds the persistent memory layer to your existing vault. Same files, same wiki-links, same graph view. Plus Ghost Connections (memory connections you didn't write down) and the rollback timeline.

If you're starting fresh, [vault.novyxlabs.com](https://vault.novyxlabs.com) is the full app. Free, no credit card. MIT licensed, self-hostable.

## Building on Karpathy's framework, not against it

I want to be clear: this isn't a "Karpathy is wrong" post. He nailed the diagnosis. Personal knowledge management has been broken for thirty years and the bottleneck has always been bookkeeping, not reading or thinking. Pointing an LLM at the bookkeeping is the right answer.

We just think the LLM needs three things to do that job well in the long run: independent memory, time-travel, and an audit log. Without them, the framework works for a month. With them, it works for a decade.

If you want to see what that looks like, the comparison page lays it out side-by-side: [vault.novyxlabs.com/compare/knowledge-base](https://vault.novyxlabs.com/compare/knowledge-base).

---

## Distribution checklist

- [ ] Post the X thread on @blakeher_on with @karpathy mention (don't tag aggressively — let it surface organically via search)
- [ ] Cross-post the blog version to dev.to with `obsidian`, `ai`, `productivity`, `karpathy` tags
- [ ] Share in relevant subreddits: r/ObsidianMD, r/PKMS, r/ChatGPTPro
- [ ] Pin in Discord
- [ ] Add to vault marketing site as a blog post (whenever the blog route lands)
- [ ] Email newsletter mention (if active)

## Tone notes

- Credit Karpathy genuinely. His framework IS the diagnosis. We're shipping an antidote, not a competitor.
- Don't shit on Obsidian + Claude Code tutorials — they're our feeder pool, not our enemies.
- Lead with the three walls (concrete problems users will recognize from their own experience), not with feature lists.
- The Obsidian plugin gives us a non-jarring CTA — "you don't have to switch, just add memory to what you have."
