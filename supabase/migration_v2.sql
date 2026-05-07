-- ============================================================
-- MIGRATION V2 — Subscriptions, Usage, Achievements, Score
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Update profiles with streak + total_score
alter table public.profiles
  add column if not exists total_score integer default 0,
  add column if not exists streak_current integer default 0,
  add column if not exists streak_best integer default 0,
  add column if not exists last_played_date date;

-- 2. Update game_sessions with score + hints
alter table public.game_sessions
  add column if not exists score integer default 0,
  add column if not exists hints_used integer default 0,
  add column if not exists message_count integer default 0,
  add column if not exists started_at timestamptz default now();

-- 3. Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'inspecteur', 'commissaire')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- 4. Daily usage table
create table if not exists public.daily_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  cases_generated integer not null default 0,
  unique(user_id, date)
);

alter table public.daily_usage enable row level security;
create policy "Users can view own usage" on public.daily_usage
  for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.daily_usage
  for insert with check (auth.uid() = user_id);
create policy "Users can update own usage" on public.daily_usage
  for update using (auth.uid() = user_id);

-- 5. Achievements table
create table if not exists public.achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);

alter table public.achievements enable row level security;
create policy "Users can view own achievements" on public.achievements
  for select using (auth.uid() = user_id);
create policy "Users can insert own achievements" on public.achievements
  for insert with check (auth.uid() = user_id);

-- 6. RLS for subscriptions insert/update (service role only via backend)
-- Service role bypasses RLS, so no insert policy needed for subscriptions

-- 7. Helper: auto-create subscription row on user signup
create or replace function public.handle_new_user_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();
