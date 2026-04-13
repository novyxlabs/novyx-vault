# Performance Notes

## Editor Benchmarks
- CodeMirror 6 renders 10K-line documents in <50ms
- Wiki-link autocomplete triggers at `[[` with <100ms popup
- Knowledge graph renders 500 nodes at 60fps on M1

## API Response Times (production)
- Memory recall (semantic search): p50 = 45ms, p99 = 180ms
- Note save (cloud): p50 = 120ms, p99 = 350ms
- Ghost Connections query: p50 = 90ms, p99 = 250ms

## Optimization TODO
- [ ] Lazy-load knowledge graph — don't render until tab is opened
- [ ] Debounce wiki-link search to 150ms instead of on-every-keystroke
- [x] Add connection pooling for Supabase — done 2026-03-28
- [x] Cache Ghost Connections per note with 5-minute TTL
