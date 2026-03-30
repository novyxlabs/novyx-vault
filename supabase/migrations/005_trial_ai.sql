-- Track free trial AI calls per user
alter table public.profiles add column if not exists trial_ai_calls_used integer default 0;

-- Atomic increment function for trial usage counter
create or replace function public.increment_trial_calls(user_id_param uuid)
returns void as $$
begin
  update public.profiles
  set trial_ai_calls_used = coalesce(trial_ai_calls_used, 0) + 1
  where id = user_id_param;
end;
$$ language plpgsql security definer;
