-- Phase 2: Cloud index layer for backlinks / graph / tag lookups.
--
-- Replaces the O(vault) full-content scans (lib/backlinks.ts, lib/graph.ts,
-- lib/connections.ts) with indexed reads. Edges are maintained incrementally
-- by SupabaseAdapter via the reindex_note() RPC on every note mutation, and
-- backfilled once via SupabaseAdapter.reindexAll().
--
-- `source_path` is the note path WITHOUT the .md extension, matching how
-- notes.path is already stored. `target_raw` is the lowercased [[target]]
-- text exactly as written; resolution to a concrete note happens at read
-- time (in the adapter), so renames/late-created notes need no re-resolution.

-- Wiki-link edges: one row per (note, distinct target).
create table public.note_links (
  user_id uuid references auth.users on delete cascade not null,
  source_path text not null,
  target_raw text not null,
  context text,
  primary key (user_id, source_path, target_raw)
);

alter table public.note_links enable row level security;

create policy "Users select own note_links"
  on public.note_links for select using (auth.uid() = user_id);
create policy "Users insert own note_links"
  on public.note_links for insert with check (auth.uid() = user_id);
create policy "Users update own note_links"
  on public.note_links for update using (auth.uid() = user_id);
create policy "Users delete own note_links"
  on public.note_links for delete using (auth.uid() = user_id);

-- Backlink lookup: seek by target. Delete/reindex by source is served by the
-- (user_id, source_path) prefix of the primary key.
create index note_links_target_idx on public.note_links (user_id, target_raw);

-- Tag edges: one row per (note, distinct tag).
create table public.note_tags (
  user_id uuid references auth.users on delete cascade not null,
  source_path text not null,
  tag text not null,
  primary key (user_id, source_path, tag)
);

alter table public.note_tags enable row level security;

create policy "Users select own note_tags"
  on public.note_tags for select using (auth.uid() = user_id);
create policy "Users insert own note_tags"
  on public.note_tags for insert with check (auth.uid() = user_id);
create policy "Users update own note_tags"
  on public.note_tags for update using (auth.uid() = user_id);
create policy "Users delete own note_tags"
  on public.note_tags for delete using (auth.uid() = user_id);

create index note_tags_tag_idx on public.note_tags (user_id, tag);

-- Atomic per-note reindex: replace a note's edges in one transaction.
-- Parsing lives in the app (lib/index/resolve.ts) — this only persists the
-- pre-parsed edges. SECURITY INVOKER (the default) runs the function as the
-- calling user, so RLS enforces per-user isolation even though p_user is an
-- argument: rows only match when p_user = auth.uid().
create or replace function public.reindex_note(
  p_user uuid,
  p_path text,
  p_links jsonb,
  p_tags jsonb
) returns void
language plpgsql
security invoker
as $$
begin
  delete from public.note_links where user_id = p_user and source_path = p_path;
  delete from public.note_tags  where user_id = p_user and source_path = p_path;

  insert into public.note_links (user_id, source_path, target_raw, context)
  select p_user, p_path, l.target, l.context
  from jsonb_to_recordset(coalesce(p_links, '[]'::jsonb)) as l(target text, context text)
  on conflict (user_id, source_path, target_raw) do nothing;

  insert into public.note_tags (user_id, source_path, tag)
  select p_user, p_path, t.tag
  from jsonb_array_elements_text(coalesce(p_tags, '[]'::jsonb)) as t(tag)
  on conflict (user_id, source_path, tag) do nothing;
end;
$$;

grant execute on function public.reindex_note(uuid, text, jsonb, jsonb) to authenticated;
