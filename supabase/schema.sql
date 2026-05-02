-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  avatar_url text,
  cases_solved integer default 0,
  cases_attempted integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cases table (predefined game cases)
create table if not exists public.cases (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  description text not null,
  cover_image text,
  difficulty text check (difficulty in ('facile', 'moyen', 'difficile')) default 'moyen',
  location text,
  year integer,
  victim text,
  suspects jsonb default '[]'::jsonb,
  solution jsonb not null,
  system_prompt text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Game sessions table
create table if not exists public.game_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  case_id uuid references public.cases(id) on delete cascade not null,
  status text check (status in ('active', 'solved', 'failed', 'abandoned')) default 'active',
  notes text default '',
  examined_clues jsonb default '[]'::jsonb,
  interrogated_suspects jsonb default '[]'::jsonb,
  final_accusation text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages table (investigation chat history)
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.game_sessions(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  message_type text check (message_type in ('narration', 'interrogation', 'clue', 'accusation', 'resolution')) default 'narration',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.game_sessions enable row level security;
alter table public.messages enable row level security;

-- Profiles: users can read all, write own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Cases: readable by all authenticated users
create policy "Cases viewable by authenticated users" on public.cases for select using (auth.role() = 'authenticated');

-- Game sessions: users can only see/edit their own
create policy "Users can view own sessions" on public.game_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.game_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.game_sessions for update using (auth.uid() = user_id);

-- Messages: through session ownership
create policy "Users can view messages of own sessions" on public.messages
  for select using (
    exists (select 1 from public.game_sessions gs where gs.id = session_id and gs.user_id = auth.uid())
  );
create policy "Users can insert messages in own sessions" on public.messages
  for insert with check (
    exists (select 1 from public.game_sessions gs where gs.id = session_id and gs.user_id = auth.uid())
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at on game_sessions change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_game_sessions_updated_at
  before update on public.game_sessions
  for each row execute procedure public.handle_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- RPC helpers for stats
create or replace function public.increment_cases_solved(user_id uuid)
returns void as $$
  update public.profiles
  set cases_solved = cases_solved + 1
  where id = user_id;
$$ language sql security definer;

create or replace function public.increment_cases_attempted(user_id uuid)
returns void as $$
  update public.profiles
  set cases_attempted = cases_attempted + 1
  where id = user_id;
$$ language sql security definer;
