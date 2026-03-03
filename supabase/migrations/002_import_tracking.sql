ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS import_completed_at timestamptz;
