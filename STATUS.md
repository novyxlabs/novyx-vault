# Novyx Vault — Master Status Summary
**Date**: April 23, 2026
**Live**: https://vault.novyxlabs.com
**Repo**: https://github.com/novyxlabs/novyx-vault
**Deploys**: Vercel auto-deploy from `main` (region: iad1)

---

## Codebase at a Glance

| Metric | Count |
|---|---|
| Total commits | 121 |
| Components | 52 |
| API routes | 64 |
| Lib modules | 25 |
| Pages | 9 (home, login, forgot-password, reset-password, features, terms, privacy, verify-email, p/[slug]) |

## Tech Stack
- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- CodeMirror 6 (Markdown editor)
- OpenAI SDK (provider-agnostic — 18+ providers supported)
- Novyx SDK (persistent AI memory)
- Supabase (Postgres + Auth + RLS)
- Tauri v2 (desktop wrapper)
- Playwright (E2E tests)

---

## Feature Inventory

### Core Note-Taking
| Feature | Component | Status |
|---|---|---|
| Markdown editor (CodeMirror 6) | `Editor`, `NoteEditor` | Working |
| Live preview | `Preview` | Working |
| Wiki-links `[[note]]` | `WikiLinkMenu` | Working |
| Slash commands `/ai`, `/tag`, etc. | `SlashCommandMenu` | Working |
| Tags + tag browser | `TagBrowser` | Working |
| Full-text search | `/api/notes/search` | Working |
| Command palette (Cmd+K) | `CommandPalette` | Working |
| Note history + versions | `HistoryPanel`, `/api/notes/history` | Working |
| Trash + restore | `TrashPanel`, `/api/notes/trash` | Working |
| Import (Markdown/JSON) | `ImportPrompt`, `/api/notes/import` | Working |
| Export (Markdown/JSON) | `/api/notes/export` | Working |
| Link ingest (URL to note) | `LinkIngestModal`, `/api/ingest` | Working |
| Tasks / TODO extraction | `TaskView`, `/api/notes/tasks` | Working |
| Vault stats | `VaultStats`, `/api/notes/stats` | Working |
| Backlinks panel | `BacklinksPanel`, `/api/notes/backlinks` | Working |
| Quick capture | `QuickCapture` | Working |
| Selection toolbar (floating) | `SelectionToolbar` | Working |

### AI Features
| Feature | Component | Status |
|---|---|---|
| AI chat sidebar | `ChatSidebar`, `/api/chat` | Working |
| Brain dump (voice-to-notes) | `BrainDump`, `/api/notes/brain-dump` | Working |
| Writing coach | `WritingCoach`, `/api/notes/writing-coach` | Working |
| Clip remix (transform text) | `ClipRemix`, `/api/notes/clip-remix` | Working |
| Ghost connections (AI-found links) | `GhostConnections`, `GhostNotification` | Working |
| Thinking evolution | `ThinkingEvolution`, `/api/thinking` | Working |
| Weekly review | `WeeklyReview`, `/api/notes/weekly-review` | Working |
| Morning briefing / Companion Home | `MorningBriefing`, `/api/briefing` | Working |
| Slash AI (inline AI in editor) | `/api/notes/slash-ai` | Working |
| Connection explanations | `/api/notes/connections/explain` | Working |

### Novyx Memory (AI Companion Layer)
| Feature | Component | Status |
|---|---|---|
| Remember / Recall | `/api/memory` | Working |
| Memory context (per-note) | `/api/memory/context` | Working |
| Memory surface | `MemoryDashboard` | Working |
| Knowledge graph | `MemoryGraph`, `/api/memory/graph` | Pro-gated |
| Insights | `/api/memory/insights` | Pro-gated |
| Audit trail | `/api/memory/audit` | Pro-gated |
| Replay | `/api/memory/replay` | Pro-gated |
| Usage stats | `/api/memory/usage` | Working |

### Visualization
| Feature | Component | Status |
|---|---|---|
| Note graph view | `GraphView`, `/api/notes/graph` | Working |
| Reflect timeline | `ReflectTimeline` | Working |

### Auth & Multi-User
| Feature | Component/Route | Status |
|---|---|---|
| Email/password auth | `/app/login/page.tsx` | Working |
| GitHub OAuth | `/api/auth/callback` | Working (verified) |
| Google OAuth | `/api/auth/callback` | Configured |
| Server-side sign-out | `/api/auth/signout` | Working (verified) |
| Password reset flow | `/forgot-password`, `/auth/confirm`, `/reset-password` | Needs Supabase URL config |
| Novyx key provisioning (signup) | `/api/auth/provision` | Working |
| Novyx key management (manual) | `/api/auth/novyx-key` | Working (verified) |
| Cross-user localStorage isolation | `clearUserLocalStorage()` | Working (verified) |

### Settings & Personalization
| Feature | Component | Status |
|---|---|---|
| AI provider management | `SettingsModal` | Working |
| 18+ provider presets | `lib/providers.ts` | Working |
| Model selector (dropdown) | `SettingsModal` | Working |
| Novyx Memory key config | `SettingsModal` | Working |
| Theme picker | `ThemePicker` | Working |
| Accent color picker | `ThemePicker` | Working |
| Cloud settings sync | `/api/settings` | Working |
| Help modal (keyboard shortcuts) | `HelpModal` | Working |

---

## AI Provider Coverage (18 Providers)

| Provider | Models | Key Format |
|---|---|---|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o3, o3-mini, o4-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo | `sk-...` |
| Anthropic | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-5, claude-sonnet-4-5, claude-opus-4-1, claude-sonnet-4-0, claude-opus-4-0, claude-haiku-3-5, claude-sonnet-3-5 | `sk-ant-...` |
| Google Gemini | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-pro, gemini-1.5-flash, gemini-1.5-flash-8b | `AIza...` |
| xAI (Grok) | grok-3, grok-3-fast, grok-3-mini, grok-3-mini-fast, grok-2 | `xai-...` |
| Perplexity | sonar-pro, sonar, sonar-reasoning-pro, sonar-reasoning, r1-1776 | `pplx-...` |
| Cohere | command-a-03-2025, command-r-plus, command-r, command-r7b | `...` |
| Mistral | mistral-large, mistral-medium, mistral-small, codestral, pixtral-large, open-mistral-nemo, open-mixtral-8x22b, ministral-8b, ministral-3b | `...` |
| Groq | 13 models (Llama 3.x, Llama 4, Mixtral, Gemma, QwQ, DeepSeek) | `gsk_...` |
| Together | 13 models (Llama, Mixtral, Qwen, QwQ, DeepSeek, Gemma) | `...` |
| DeepSeek | deepseek-chat, deepseek-reasoner | `sk-...` |
| Moonshot/Kimi | kimi-k2.5, kimi-k2 variants, moonshot-v1 variants (Global + China endpoints) | `sk-...` |
| MiniMax | M2.5, M2.5-highspeed, M2.1, M2.1-highspeed | `eyJ...` |
| OpenRouter | 8 models (aggregator — access any model) | `sk-or-...` |
| Fireworks | 5 models (Llama, Qwen, DeepSeek) | `fw_...` |
| Cerebras | llama-3.3-70b, llama-3.1-8b, llama-3.1-70b | `csk-...` |
| SambaNova | 6 models (Llama, DeepSeek, Qwen) | `...` |
| Ollama (Local) | 20 models (Llama, DeepSeek, Qwen, Phi, Gemma, Mistral, etc.) | Not required |
| LM Studio (Local) | loaded-model | Not required |

---

## Recent Sprint (Through March 18 — 121 Commits)

### Bugs Fixed
- [x] GitHub OAuth blocked by CSP `form-action` directive
- [x] OAuth callback blocked by strict Referrer-Policy
- [x] Sign-out not clearing httpOnly cookies (moved to server-side route)
- [x] Cross-user localStorage leakage (API keys persisted between accounts)
- [x] Novyx key save feedback not visible (moved inline)
- [x] UUID leak in note titles
- [x] Duplicate tags on creation
- [x] Ghost notification stacking
- [x] List indent behavior in editor
- [x] Auth confirm route not handling PKCE flow

### Features Added
- [x] Companion Home (redesigned MorningBriefing — AI greeting, theme chips, revisit cards, quick actions)
- [x] Reflect Timeline (chronological view of notes + memories + insights with sparkline)
- [x] Novyx Memory API key management in Settings
- [x] Server-side sign-out with full cookie cleanup
- [x] 18 AI providers with comprehensive model lists (was 13 with sparse models)
- [x] Dropdown model selector (replaces button grid)
- [x] AI provider setup guidance across all AI features

### Security Hardening
- [x] localStorage cleared on sign-out (prevents cross-user key leakage)
- [x] Server-side sign-out (httpOnly cookies can't be cleared client-side)
- [x] SSRF prevention on provider base URLs
- [x] API keys stripped before cloud settings persistence
- [x] Auth cookies manually expired on sign-out

---

## Known Issues / Open Items

| Priority | Issue | Blocker? |
|---|---|---|
| P0 | Password reset flow — Supabase URL Configuration needs redirect URLs added | Needs dashboard access |
| P1 | Lighthouse/SEO score likely still low (~52) — no SEO sprint done | No |
| P1 | Tauri desktop build untested against latest code | No |
| P2 | "On Your Mind" theme chips empty for new users (needs memory volume) | No — works with data |
| P2 | Pro-gated features (Graph, Insights, Replay, Audit) — billing integration shipped via Stripe | Done |
| P3 | Sync (Phase 6) — offline-first with conflict resolution | Deferred |

---

## Supabase Dashboard Action Required

**Authentication > URL Configuration — add these redirect URLs:**
```
https://vault.novyxlabs.com/auth/confirm
https://vault.novyxlabs.com/api/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/api/auth/callback
```
**Site URL:** `https://vault.novyxlabs.com`

This unblocks the password reset flow.

---

## Architecture Overview

```
app/
  api/              64 API routes (auth, notes, memory, chat, settings, billing, control)
  login/            Email/password + OAuth login
  forgot-password/  Password reset request
  reset-password/   New password form
  auth/confirm/     Email verification + PKCE handler
  features/         Public features page
  terms/            Terms of service
  privacy/          Privacy policy
components/         52 React components
lib/                25 modules (storage adapters, auth, novyx client, providers, transcription, etc.)
src-tauri/          Tauri v2 desktop wrapper (Rust)
public/             Static assets, icons
```

**Storage Modes:**
- `STORAGE_MODE=supabase` → Supabase Postgres (cloud, multi-user)
- Unset → `~/SecondBrain/` filesystem (desktop/local)

**Data Flow:**
```
User → AppShell → Sidebar + NoteEditor/MorningBriefing/ReflectTimeline
                → API Routes → StorageAdapter (Supabase or Filesystem)
                             → Novyx SDK (AI memory)
                             → OpenAI SDK (provider-agnostic chat/AI)
```
