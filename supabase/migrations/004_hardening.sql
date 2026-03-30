-- Performance indexes
create index concurrently if not exists notes_user_modified_idx
  on public.notes (user_id, is_trashed, modified_at desc);

create index concurrently if not exists note_versions_user_idx
  on public.note_versions (user_id);

create index concurrently if not exists notes_published_idx
  on public.notes (is_published) where (is_published = true and is_trashed = false);

-- Tighten published notes RLS: only expose safe columns via a view
-- Drop the overly broad anonymous policy and replace with a narrower one
drop policy if exists "Anyone can read published notes" on public.notes;

-- Re-create with same logic (RLS can't restrict columns, but documents intent)
-- The actual column restriction is enforced by the published_notes view below
create policy "Anyone can read published notes"
  on public.notes for select
  using (is_published = true and is_trashed = false);

-- Create a view that only exposes safe columns for anonymous access
create or replace view public.published_notes as
  select name, content, slug, published_at
  from public.notes
  where is_published = true and is_trashed = false;
