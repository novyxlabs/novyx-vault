# TODOS

## Product Direction

Novyx Vault is being tightened around one target: Obsidian-class markdown knowledge work, plus durable AI memory that is inspectable, reversible, and portable.

## P0

### Consolidate navigation around Vault, Capture, and Memory

The sidebar should keep advanced agent-control surfaces out of the primary flow. Core surfaces are notes, search, graph, capture, memory, tags, tasks, stats, settings, import, export, and trash.

### Remove stale marketing and demo collateral

Launch drafts, SEO audit artifacts, demo-only Playwright projects, and non-Obsidian comparison pages should stay out of the product repo unless they are actively maintained.

### Fix production truth gaps

Audit README, public pages, and FAQ for claims about sync, offline AI, cloud mode, provider security, and desktop readiness. Claims must match implementation.

## P1

### Replace full-vault scan search

Cloud mode should use indexed database search. Desktop mode should use a local index instead of repeatedly walking every markdown file.

### Unify Capture

Brain Dump, Voice Capture, Clip Remix, Link Ingest, and Quick Capture should feel like one capture workflow, not unrelated modals.

### Unify Memory

Memory Dashboard, Reflect, Audit Trail, Rollback History, and Thinking Evolution should converge into a single Memory surface with tabs or subviews.

### Verify desktop-local behavior

Build and run the Tauri app, verify local markdown storage, offline note CRUD, import/export, and basic capture behavior.

## P2

### Attachments and Obsidian import depth

Support common Obsidian vault realities: attachments, embedded images, nested folders, frontmatter, aliases, and external edits.

### Advanced agent-control quarantine

Mission Control and governed action APIs can remain available under Advanced, but should not shape the primary Vault product.
