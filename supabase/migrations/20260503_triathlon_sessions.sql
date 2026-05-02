-- Daily Brain Triathlon completions + ZCI (ZAZAZA Cognitive Index)

create table public.triathlon_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  played_date date not null,
  focus_game_id text not null,
  focus_score_raw numeric not null,
  focus_score_normalized numeric not null,
  memory_game_id text not null,
  memory_score_raw numeric not null,
  memory_score_normalized numeric not null,
  speed_game_id text not null,
  speed_score_raw numeric not null,
  speed_score_normalized numeric not null,
  zci_score numeric not null,
  country_code text,
  created_at timestamptz default now()
);

alter table public.triathlon_sessions enable row level security;

create policy "Users can read own triathlon sessions"
  on public.triathlon_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own triathlon sessions"
  on public.triathlon_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own triathlon sessions"
  on public.triathlon_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index triathlon_sessions_user_date_unique
  on public.triathlon_sessions (user_id, played_date);

create index triathlon_sessions_played_date_idx
  on public.triathlon_sessions (played_date);

create policy "Public can read triathlon sessions for leaderboard"
  on public.triathlon_sessions for select
  using (true);
