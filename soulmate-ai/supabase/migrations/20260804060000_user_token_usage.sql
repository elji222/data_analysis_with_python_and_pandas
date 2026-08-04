-- Per-request token usage for admin reporting

create table if not exists public.user_token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  model_id text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  conversation_id text,
  message_id text,
  source text not null default 'estimated',
  created_at timestamptz not null default now()
);

create index if not exists user_token_usage_user_created_idx
  on public.user_token_usage (user_id, created_at desc);

create index if not exists user_token_usage_created_idx
  on public.user_token_usage (created_at desc);

alter table public.user_token_usage enable row level security;

create policy "Users insert own token usage"
  on public.user_token_usage
  for insert
  with check (auth.uid() = user_id);

create policy "Users read own token usage"
  on public.user_token_usage
  for select
  using (auth.uid() = user_id);
