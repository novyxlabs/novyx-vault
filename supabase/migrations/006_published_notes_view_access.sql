-- Restrict anonymous published-note access to a limited-column view.
--
-- RLS policies cannot restrict columns. The previous anonymous policy on
-- public.notes exposed every column of published rows to anon clients.
drop policy if exists "Anyone can read published notes" on public.notes;

create or replace view public.published_notes as
  select name, content, slug, published_at
  from public.notes
  where is_published = true and is_trashed = false;

revoke all on public.published_notes from public;
grant select on public.published_notes to anon;
grant select on public.published_notes to authenticated;
