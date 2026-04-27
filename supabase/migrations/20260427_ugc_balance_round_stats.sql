alter table public.ugc_games
add column if not exists balance_a_pick_count int not null default 0;

alter table public.ugc_games
add column if not exists balance_b_pick_count int not null default 0;
