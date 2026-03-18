# Contributing to Novyx Vault

Thanks for your interest in contributing to Novyx Vault! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/novyxlabs/novyx-vault.git
cd novyx-vault
npm install
npm run dev
```

The app runs at `http://localhost:3000` in desktop mode (filesystem storage at `~/SecondBrain/`).

### Cloud Mode (optional)

To run with Supabase (auth + Postgres):

```bash
cp .env.example .env.local
# Fill in your Supabase credentials
STORAGE_MODE=supabase npm run dev
```

## Development

### Project Structure

```
app/           Next.js pages and API routes
components/    React components (52)
lib/           Shared modules (auth, storage, providers, memory)
tests/         Playwright E2E tests
src-tauri/     Tauri v2 desktop wrapper
```

### Running Tests

```bash
npm test              # Playwright E2E tests (headless)
npm run test:unit     # Vitest unit tests
```

### Code Style

- TypeScript strict mode
- Tailwind CSS 4 for styling (theme tokens in `globals.css`)
- No inline CSS variables — use Tailwind classes
- Components are in `components/`, one per file
- API routes follow Next.js App Router conventions

## Making Changes

1. **Fork the repo** and create a branch from `main`
2. **Make your changes** — keep PRs focused and small
3. **Run tests** — make sure existing tests pass
4. **Submit a PR** with a clear description of what and why

### What We're Looking For

- Bug fixes
- Performance improvements
- New AI provider integrations
- Accessibility improvements
- Documentation improvements
- Test coverage

### What to Avoid

- Large refactors without prior discussion — open an issue first
- Adding dependencies without justification
- Changes to the Novyx SDK integration — the SDK is the source of truth for memory operations

## Novyx SDK

Vault uses the [Novyx SDK](https://www.npmjs.com/package/novyx) (`novyx` npm package) for all memory operations. All memory calls go through `lib/memory.ts` which wraps the SDK. Do not add raw `fetch` calls to the Novyx API.

Key SDK methods used:
- `nx.remember()` / `nx.recall()` / `nx.list()` / `nx.forget()`
- `nx.dashboard()` — single-call usage + gating data
- `nx.audit()` / `nx.health()`
- `nx.replayTimeline()` / `nx.replayDrift()`

## Reporting Issues

Use [GitHub Issues](https://github.com/novyxlabs/novyx-vault/issues). Include:

- Steps to reproduce
- Expected vs actual behavior
- Browser/OS info
- Screenshots if applicable

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
