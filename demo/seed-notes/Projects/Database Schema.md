# Database Schema

## Users & Auth
- Supabase Auth handles OAuth (GitHub, Google) + email/password
- `profiles` table extends auth.users with app-specific fields
- Row-level security on all tables — users only see their own data

## Notes Storage
- `notes` table: user_id, path, name, content, is_folder, is_trashed, modified_at
- `note_versions` table: note_id, timestamp, content (last 30 versions)
- Unique constraint on (user_id, path) — prevents duplicate paths

## Decision Log
- **2026-03-15**: Switched from JSON columns to normalized tables for note metadata. JSON was causing index bloat on Postgres.
- **2026-03-22**: Added `is_trashed` soft-delete instead of hard delete. Enables trash/restore flow without losing version history.
- **2026-04-01**: Chose `modified_at` timestamp over auto-updating `updated_at` trigger — gives the app control over when "modified" means "user edited" vs "system synced".

## Related
- [[Vault Roadmap]] — architecture decisions reference this schema
- [[Performance Notes]] — query optimization work
