-- Add publish columns to notes table
alter table public.notes add column if not exists is_published boolean default false;
alter table public.notes add column if not exists slug text;
alter table public.notes add column if not exists published_at timestamptz;

-- Unique slug across all published notes (globally unique, not per-user)
create unique index if not exists notes_slug_unique
  on public.notes (slug) where (is_published = true and is_trashed = false);

-- Allow anonymous reads for published notes (public pages)
create policy "Anyone can read published notes"
  on public.notes for select
  using (is_published = true and is_trashed = false);
