-- Novyx Vault Cloud Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  novyx_api_key text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Notes
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  path text not null,
  name text not null,
  content text default '',
  is_folder boolean default false,
  is_trashed boolean default false,
  original_path text,
  trashed_at timestamptz,
  modified_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.notes enable row level security;

create policy "Users can read own notes"
  on public.notes for select using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes for insert with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes for update using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete using (auth.uid() = user_id);

-- Unique path per user (only for non-trashed notes)
create unique index notes_user_path_unique
  on public.notes (user_id, path) where (is_trashed = false);

-- Index for listing notes in a directory
create index notes_user_folder_idx
  on public.notes (user_id, is_trashed) where (is_trashed = false);

-- Full-text search index
alter table public.notes add column fts tsvector
  generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(content, ''))) stored;

create index notes_fts_idx on public.notes using gin (fts);

-- Note versions (history)
create table public.note_versions (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  timestamp bigint not null,
  created_at timestamptz default now()
);

alter table public.note_versions enable row level security;

create policy "Users can read own versions"
  on public.note_versions for select using (auth.uid() = user_id);

create policy "Users can insert own versions"
  on public.note_versions for insert with check (auth.uid() = user_id);

create policy "Users can delete own versions"
  on public.note_versions for delete using (auth.uid() = user_id);

create index note_versions_note_idx
  on public.note_versions (note_id, timestamp desc);
