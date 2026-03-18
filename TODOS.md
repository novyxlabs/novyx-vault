# TODOS

## Launch

### Make repo public on GitHub

**What:** Flip novyxlabs/novyx-vault from private to public.

**Why:** Vault is positioned as an open-source reference implementation for building on Novyx Core. Can't launch without public access.

**Context:** LICENSE (MIT) and CONTRIBUTING.md already added. Sensitive env vars stripped. Security audit passed (March 12). QA audit passed (March 13). All blockers cleared.

**Effort:** XS
**Priority:** P0
**Depends on:** None

### Demo video

**What:** Record a 2-3 minute walkthrough showing Vault's key features — notes, AI chat with memory, Control, Draft Review.

**Why:** Landing page needs a hero video. "Show don't tell" for the Obsidian-alternative positioning.

**Context:** Plan saved to `memory/demo-video-plan.md`. Build AFTER launch — don't block on it.

**Effort:** M
**Priority:** P1
**Depends on:** Repo public

## Frontend

### Tauri desktop build verification

**What:** Full test pass of Tauri desktop build — compile, launch, create note, verify offline mode.

**Why:** Desktop app is part of the free tier story. Last verified March 10 — needs re-check after recent changes (Mission Control, Draft Review, Control rewire).

**Context:** `tauri:dev`/`tauri:build` scripts blank STORAGE_MODE and SUPABASE_URL. Port 3333. 21MB release binary last time. DMG needs `brew install create-dmg`.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Mobile responsive pass on Mission Control

**What:** Test and fix Mission Control layout on mobile viewports (375px, 390px).

**Why:** Mission Control is a full-screen overlay — if it breaks on mobile, users can't close it or navigate tabs.

**Context:** Built March 14, not yet tested on mobile viewports. Escape key handler added but touch users need visible close button.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Drafts tab loading state on API error

**What:** Drafts tab in Mission Control shows infinite spinner when the drafts API returns 500.

**Why:** QA finding from March 14 — catch block sets empty array but spinner doesn't resolve visually.

**Context:** `components/MissionControl.tsx` line ~170. The `fetchDrafts` catch sets `setDrafts([])` and `setDraftsLoading(false)` — may be a race condition or the loading state isn't checked correctly in the render.

**Effort:** S
**Priority:** P2
**Depends on:** None

## Backend

### Novyx SDK upgrade to v2.11.0

**What:** Upgrade `novyx` npm package when v2.11.0 publishes — adds `listApprovals`, `approveAction`, `listPolicies` + 24 other methods.

**Why:** Mission Control currently uses raw fetch to proxy routes. With SDK methods, can simplify the API layer.

**Context:** JS SDK at full parity with Python (~78 methods). Core team confirmed ready. Current proxy routes in `app/api/control/` work fine as-is — this is a cleanup, not a blocker.

**Effort:** M
**Priority:** P3
**Depends on:** npm publish of novyx v2.11.0

## Testing

## Completed

### Voice Capture
**What:** Record, transcribe (local Whisper or cloud API), 18+ providers), and AI-structure voice memos into markdown notes.
**Completed:** v0.3.0 (2026-03-17)

### Self-serve billing via Stripe
**What:** Pro upgrade flow with Stripe Checkout, customer portal for subscription management.
**Completed:** v0.3.0 (2026-03-17)

### QA audit — mobile responsive fixes
**What:** Hamburger nav on mobile, comparison table overflow fix, footer touch targets.
**Completed:** v0.3.0 (2026-03-18)

### Mission Control dashboard
**What:** Full mission control UI with approvals, activity stream, drafts, policies, health tabs.
**Completed:** v0.2.0 (2026-03-14)

### Draft Review UI
**What:** Visual draft review with diff view, merge/reject, branch overview.
**Completed:** v0.2.0 (2026-03-14)

### Security audit fixes
**What:** 8 findings fixed — XSS, path traversal, SSRF, import route guard.
**Completed:** v0.2.0 (2026-03-15)

### Control wired to live Core endpoints
**What:** Dropped NOVYX_CONTROL_URL, all Control routes now proxy through Novyx RAM API.
**Completed:** v0.2.0 (2026-03-14)

### Landing page repositioned as Obsidian alternative
**What:** Complete rewrite — "A notes app where your AI actually remembers you."
**Completed:** v0.1.0 (2026-03-12)

### E2E tests for Mission Control
**What:** 8 Playwright tests covering open/close, tabs, Escape key, empty states, error states, SSE cleanup.
**Completed:** v0.3.0 (2026-03-15)

### E2E tests for Draft Review
**What:** 3 Playwright tests covering tab access, draft list/empty state, close/reopen.
**Completed:** v0.3.0 (2026-03-15)

### E2E tests for core views
**What:** 85 Playwright tests covering UsageView, AuditTrailView, RollbackHistoryView, onboarding, error boundaries.
**Completed:** v0.1.0 (2026-03-12)
