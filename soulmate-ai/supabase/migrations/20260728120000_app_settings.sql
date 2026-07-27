create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('billing', jsonb_build_object('free_access_for_all', false))
on conflict (key) do nothing;
