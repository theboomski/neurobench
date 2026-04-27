create table if not exists public.leaderboard_sessions (
  nonce text primary key,
  game_id text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_leaderboard_sessions_expiry
  on public.leaderboard_sessions (expires_at, used);

alter table public.leaderboard_sessions enable row level security;

-- Block direct client access; server uses service role key.
revoke all on public.leaderboard_sessions from anon;
revoke all on public.leaderboard_sessions from authenticated;

-- Harden leaderboard table against direct client-side inserts/updates/deletes.
revoke insert, update, delete on public.leaderboard from anon;
revoke insert, update, delete on public.leaderboard from authenticated;
