create table if not exists public.ugc_reports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.ugc_games(id) on delete cascade,
  game_slug text not null,
  game_type public.ugc_game_type not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_ugc_reports_created on public.ugc_reports (created_at desc);
create index if not exists idx_ugc_reports_game on public.ugc_reports (game_id);

alter table public.ugc_reports enable row level security;

drop policy if exists "ugc_reports_no_public_read" on public.ugc_reports;
create policy "ugc_reports_no_public_read" on public.ugc_reports
for select
using (false);

drop policy if exists "ugc_reports_allow_insert" on public.ugc_reports;
create policy "ugc_reports_allow_insert" on public.ugc_reports
for insert
with check (true);
