# Vault Roadmap

## Q2 2026

### Shipped
- Ghost Connections sidebar
- Memory rollback with timeline view
- Voice capture (on-device Whisper)
- 20+ AI providers via BYOK
- Obsidian import

### In Progress
- Obsidian plugin (marketplace submission pending)
- Mobile support (Tauri v2)
- Team collaboration (shared spaces)

## Q3 2026
- Self-hosted enterprise deployment
- Webhook integrations
- Advanced Cortex insights
- Cross-vault memory sharing

## Architecture Decisions
- Chose [[CodeMirror 6]] over ProseMirror — faster, better keyboard handling
- [[Supabase]] for cloud mode with row-level security
- [[Tauri v2]] for desktop — Rust backend, web frontend
- Memory layer powered by [[Novyx Core]] — same API across all surfaces
