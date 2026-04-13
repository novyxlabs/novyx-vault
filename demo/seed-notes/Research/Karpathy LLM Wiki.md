# Karpathy LLM Wiki

Source: [gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 16M+ views on X

## The Pattern
Three layers:
1. **Raw sources** — immutable folder of papers, articles, screenshots
2. **The wiki** — LLM-compiled markdown pages, interlinked, living
3. **The schema** — CLAUDE.md-style conventions for how the LLM maintains the wiki

Three operations:
- **Ingest** — new source updates 10-15 wiki pages
- **Query** — synthesize answers with citations
- **Lint** — find contradictions, orphan pages, gaps

## Key Quote
> "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping. LLMs handle the bookkeeping."

## What's Missing
1. No persistent memory beyond the files — conversation context is lost
2. No rollback — if the LLM corrupts a page, you have git at best
3. No audit trail — can't verify why the LLM made a specific claim

These three gaps are exactly what [[AI Agent Memory|Novyx Core]] solves.

## Related
- [[AI Agent Memory]] — our approach to filling these gaps
- [[Vault Roadmap]] — implementation timeline
