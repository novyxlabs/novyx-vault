# QA Report: Mission Control

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **URL** | http://localhost:3000 |
| **Scope** | Mission Control component |
| **Mode** | full |
| **Duration** | ~10min |
| **Pages visited** | 5 (Approvals, Activity, Drafts, Policies, Health) |
| **Screenshots** | 7 |
| **Framework** | Next.js 16 |

## Health Score: 72/100

| Category | Score |
|----------|-------|
| Console | 55 |
| Links | 100 |
| Visual | 85 |
| Functional | 70 |
| UX | 65 |
| Performance | 80 |
| Accessibility | 60 |

## Top 3 Things to Fix

1. **ISSUE-001: Missing key prop warning** — React console error in MissionControl render
2. **ISSUE-002: No Escape key handler** — Cannot close Mission Control with Escape despite it being a full-screen modal
3. **ISSUE-003: Health tab shows empty content** — No loading state or empty state shown when health data fails

## Console Health

| Error | Count | First seen |
|-------|-------|------------|
| Each child in a list should have a unique "key" prop (MissionControl) | 1 | Policies tab |
| Failed to load resource: 500 (Internal Server Error) | 2 | Dashboard load |
| CSP violation: vercel-scripts | 3 | Every page load (localhost-only, not a bug) |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 2 |
| **Total** | **6** |

## Issues

### ISSUE-001: React key prop warning in MissionControl

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | console |
| **URL** | http://localhost:3000 (Mission Control > Policies tab) |

**Description:** React warns: "Each child in a list should have a unique 'key' prop. Check the render method of `MissionControl`." This appeared when the Policies tab rendered with data. All `.map()` calls appear to have keys, but the warning suggests one is producing a `undefined` key at runtime.

**Repro Steps:**

1. Open Mission Control → click Policies tab
2. Open browser console
3. **Observe:** React key warning logged

![Policies](screenshots/mc-policies-tab.png)

---

### ISSUE-002: No Escape key handler to close Mission Control

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:3000 (Mission Control open) |

**Description:** Mission Control is a full-screen overlay (`fixed inset-0 z-50`) with `role="dialog" aria-modal="true"`, but pressing Escape does nothing. Standard modal UX and WCAG expectations require Escape to close modals. The close X button exists but is small and in the top-right corner.

**Repro Steps:**

1. Click "Control" in sidebar to open Mission Control
2. Press Escape key
3. **Observe:** Nothing happens — modal stays open

---

### ISSUE-003: Health tab shows empty content on API failure

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | functional |
| **URL** | http://localhost:3000 (Mission Control > Health tab) |

**Description:** When the health API returns an error or empty data, the Health tab shows the title "Memory Health" with a refresh button but no content — no loading spinner, no error state, no empty state message. Expected: show "Unable to fetch health data" or similar.

**Repro Steps:**

1. Open Mission Control → click Health tab
2. **Observe:** Title "Memory Health" shown but body is empty

![Health](screenshots/mc-health-tab.png)

---

### ISSUE-004: Drafts tab shows infinite loading spinner on API error

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | functional |
| **URL** | http://localhost:3000 (Mission Control > Drafts tab) |

**Description:** When the drafts API returns a 500 or fails, the Drafts tab shows a loading spinner that never resolves. The catch block sets `setDrafts([])` which should show the empty state, but the loading spinner appears to render indefinitely. The "1 Issue" toast at bottom left also appears, likely from Next.js dev overlay.

**Repro Steps:**

1. Open Mission Control → click Drafts tab
2. **Observe:** Loading spinner shown, never resolves to empty state

![Drafts](screenshots/mc-drafts-tab.png)

---

### ISSUE-005: X close button not easily clickable

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | ux |
| **URL** | http://localhost:3000 (Mission Control header) |

**Description:** The close button (X icon, 16px) at top-right has a small hit target (`p-1.5`). The Playwright click timed out trying to hit it. While it likely works for mouse users, touch targets and accessibility guidelines recommend at least 44x44px for interactive elements.

---

### ISSUE-006: "Live" indicator always shows green even when stream fails

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | functional |
| **URL** | http://localhost:3000 (Mission Control header) |

**Description:** The "Live" green dot in the header pulses even though the SSE stream to `/api/control/stream` returns 500. The `connectStream` sets `streamConnected` to `true` on `es.onopen`, but the EventSource may fire `onopen` before receiving the error response.

---

## What Works Well

- **Tab navigation** — All 5 tabs render and switch correctly
- **Empty states** — Approvals shows a nice "All clear" empty state with checkmark icon
- **Policy display** — Policies loaded from the API and rendered with Active badges, names, and descriptions
- **Activity stream** — "Listening for events" empty state is clear and informative
- **Visual design** — Consistent with the rest of the Vault UI, dark theme, proper use of accent colors
- **Component structure** — Lazy-loads policies and drafts only when their tabs are selected
- **SSE cleanup** — Properly closes EventSource when panel closes and on unmount
