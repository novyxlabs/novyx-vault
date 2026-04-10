# Changelog

All notable changes to Novyx Vault are documented here.

## [Unreleased]

### Added
- **Governance Dashboard** — New Mission Control tab surfacing the Novyx Core Phase 4 governance APIs: stat totals, violations by policy (with severity breakdown), violations by agent (click to drill down), and an activity-over-time stacked bar chart.
- **Per-agent violations drilldown** — Inspect individual violations with severity, risk score, triggered policy, reason, and event type.
- **Policy CRUD** — Create, edit, and delete policies from the Policies tab. JSON rules editor with live validation. Agent picker for scoping policies to a specific agent (Pro tier).
- **Policy propagation notice** — Editor warns that policy changes can take up to 60s to propagate across Novyx Core instances due to multi-machine caching.
- **Voice Capture** — Record meetings, lectures, or voice memos. Transcribe locally on-device (WebAssembly Whisper) or via cloud API. AI structures your transcript into clean markdown notes with titles, sections, and action items.
- **Voice Capture animated demo** — Features page now includes an interactive waveform demo
- **Self-serve upgrade via Stripe** — Pro upgrade flow with Stripe Checkout integration across all gated features
- **Billing management** — Stripe Customer Portal for subscription management

### Changed
- **Novyx SDK** — Bumped from 2.11.0 to 3.1.0 for typed governance wrappers (`governanceDashboard`, `agentViolations`, `createPolicy`, `updatePolicy`, `deletePolicy`)
- **MCP tool count** — Updated references from 107 to 119 to match the latest Novyx Core release

### Changed
- **Landing page hero** — Replaced placeholder with real app screenshot showing the editor, wiki-links, live preview, and ghost connections
- **Mobile nav** — Collapsed to hamburger menu on small screens for cleaner mobile experience
- **Comparison table** — Responsive padding on mobile to prevent horizontal overflow
- **Footer touch targets** — "Novyx Labs" link now meets 44px minimum touch target

### Fixed
- Deterministic waveform rendering in VoiceCaptureDemo (no longer randomized on each render)
- Provider JSON payload accepted in transcribe route (was form-data only)
- ES2018 regex dotAll flag replaced with cross-target equivalent for broader compatibility
- Vercel deploy size reduced via `.vercelignore` (excludes Tauri target and build artifacts)

## [0.3.0] — 2026-03-15

### Added
- **Mission Control dashboard** — full-screen overlay with 5 tabs: Approvals (approve/deny agent actions), Activity (real-time SSE event stream), Drafts (review agent memory proposals), Policies (Sentinel policy viewer), Health (memory health score with ring gauge)
- **Draft Review UI** — git-like review workflow for agent memory drafts: diff view, merge/reject, branch overview, similarity detection, AI recommendation badges
- **E2E tests for Mission Control** — 8 Playwright tests covering open/close, tab switching, Escape key, empty states, error states, SSE cleanup
- **E2E tests for Draft Review** — 3 Playwright tests covering tab access, draft list/empty state, close/reopen
- **TODOS.md** — structured backlog with priority ordering, integrated with gstack `/retro`

### Changed
- **Control rewired to Core** — dropped `NOVYX_CONTROL_URL` env var; all Control routes now proxy through the Novyx RAM API directly
- **Import route security** — flipped from platform denylist to positive opt-in (`ALLOW_LOCAL_IMPORT=true`), preventing host filesystem exposure on any hosted deployment

### Fixed
- **Mission Control Escape key** — full-screen modal now closes on Escape (accessibility requirement)
- **Health tab empty state** — now shows "Failed to load health data" with retry button instead of blank content on API error
- **SSE reconnect timer leak** — reconnect `setTimeout` is tracked and cleared when Mission Control closes, preventing background reconnection
- **Close button accessibility** — larger hit target (p-2) with `aria-label="Close Mission Control"`
- **Policy key prop warning** — fallback key prevents React console warning when policy IDs are undefined

## [0.2.0] — 2026-03-13

### Added
- **Control tab** — UI for Novyx governed action plane (pending approvals, action history, policy overview)
- **Usage & Limits view** — pro-gated dashboard showing memory usage and plan limits
- **Audit Trail view** — pro-gated timeline of all memory operations with chain verification badge
- **Rollback History view** — pro-gated rollback interface with point-in-time recovery
- **Error boundaries** — all Novyx-dependent views wrapped with dismissible fallback modals
- **Onboarding flow** — 3-step guide for new users with zero notes
- **Memory source badges** — Vault / MCP / API indicators on memory cards
- **Chain verification** — green/red badge showing tamper-evident chain integrity
- **Novyx health indicator** — green/red dot in Settings showing API connectivity
- **MCP setup guide** — collapsible install instructions in Settings
- **AI provider "Test Connection"** — lightweight key validation before saving
- **E2E test suite** — 70 Playwright tests covering core user flows
- **Unit tests for `lib/control.ts`** — 15 tests covering all Control API functions
- **Plausible analytics** — privacy-friendly, proxied analytics
- **LICENSE (MIT)** and **CONTRIBUTING.md**

### Changed
- **Landing page rewrite** — repositioned as "Obsidian alternative with AI that remembers," added comparison table, provider badges, desktop/cloud split
- **Novyx SDK migration** — all raw fetch calls replaced with `novyx` SDK methods; consolidated to `nx.dashboard()` for usage/gating
- **Login form** — client-side email format validation, dynamic password requirement indicators (green/red), removed duplicate validation messages
- **Mobile nav** — Features link now visible on all screen sizes
- **GitHub links** — updated to point to `github.com/novyxlabs/novyx-vault`
- **Settings modal** — redesigned layout with scrollable content area
- **Tailwind migration** — replaced inline CSS variables with Tailwind theme classes across all pages

### Fixed
- Silent data loss on note save failures — now shows error with retry
- 3 security findings: XSS in publish, path traversal in fs-adapter, desktop publish guard
- 6 security audit findings + 2 follow-up bypasses (SSRF protection, input sanitization, CSP hardening)
- API timeouts on all external calls to prevent cold-start hangs
- Memory recall indicator disappearing after streaming ends
- Onboarding showing for users with existing notes
- Signout route guarded with `isCloudMode()` for Tauri desktop safety
- Novyx key input visible in desktop mode
- Shortcut conflict, chain badge, import visibility, key persistence (QA audit)
- Provider card, undo protection, list corruption, slash commands (QA rounds 2-3)
- Password reset flow — correct redirectTo and cookie handling

### Security
- XSS sanitization in `lib/sanitize.ts`
- SSRF protection in `lib/providers.ts` — blocks private IPs and internal hostnames
- Path traversal guard in `lib/storage/fs-adapter.ts`
- Desktop publish guard — prevents cloud-only operations in desktop mode
- API key cloud sync strips keys server-side, merges back from localStorage on load
- All external API calls have configurable timeouts

## [0.1.0] — 2026-02-26

### Added
- Initial release: Markdown editor, wiki-links, backlinks, knowledge graph
- AI chat with persistent memory (Novyx SDK)
- 18+ AI providers (OpenAI, Anthropic, Gemini, Ollama, etc.)
- Share, publish, and social export
- Daily digest emails (Vercel Cron + Resend)
- Obsidian import
- Brain Dump, Clip Remix, and slash commands
- Folders, tags, and full-text search
- GitHub OAuth + email/password auth (Supabase)
- Desktop mode via Tauri v2
- Cloud mode with Supabase (Postgres + RLS)
