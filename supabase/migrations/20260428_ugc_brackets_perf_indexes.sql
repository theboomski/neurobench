create index if not exists idx_ugc_play_history_game_winner
on public.ugc_play_history (game_id, winner_item_id)
where winner_item_id is not null;

create or replace function public.ugc_bracket_final_wins(p_game_id uuid)
returns table (winner_item_id uuid, final_wins bigint)
language sql
stable
security definer
set search_path = public
as $$
  select ph.winner_item_id, count(*)::bigint as final_wins
  from public.ugc_play_history ph
  where ph.game_id = p_game_id
    and ph.winner_item_id is not null
  group by ph.winner_item_id
$$;

revoke all on function public.ugc_bracket_final_wins(uuid) from public;
grant execute on function public.ugc_bracket_final_wins(uuid) to anon, authenticated, service_role;
