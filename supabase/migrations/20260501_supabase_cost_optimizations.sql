-- Cost optimizations: aggregates, indexes, storage MIME, optional pg_cron cleanup

-- Allow WebP avatars (client uploads image/webp after normalizeImageToWebp)
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

-- Fun Sends card uploads use image/webp (PNG retained for compatibility)
update storage.buckets
set allowed_mime_types = array['image/png', 'image/webp']
where id = 'cards';

-- Single-query play counts (replaces paginated full scan in app)
create or replace function public.get_game_play_counts()
returns table (game_id text, play_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select gp.game_id::text, count(*)::bigint as play_count
  from public.game_plays gp
  group by gp.game_id;
$$;

revoke all on function public.get_game_play_counts() from public;
grant execute on function public.get_game_play_counts() to anon, authenticated, service_role;

-- Bracket hub language filter (replaces 5000-row language scan)
create or replace function public.get_ugc_public_language_counts()
returns table (language text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lower(btrim(u.language))::text as language, count(*)::bigint as count
  from public.ugc_games u
  where u.visibility = 'public'::ugc_visibility
    and u.is_approved = true
  group by lower(btrim(u.language))
  having lower(btrim(u.language)) <> ''
  order by count desc
  limit 10;
$$;

revoke all on function public.get_ugc_public_language_counts() from public;
grant execute on function public.get_ugc_public_language_counts() to anon, authenticated, service_role;

create index if not exists idx_leaderboard_game_score
  on public.leaderboard (game_id, score desc, created_at desc);

create index if not exists idx_ugc_games_visibility_approved
  on public.ugc_games (visibility, is_approved, is_nsfw, created_at desc);

-- Optional: nightly cleanup of expired leaderboard sessions when pg_cron is enabled
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('cleanup_leaderboard_sessions');
    exception
      when others then
        null;
    end;
    perform cron.schedule(
      'cleanup_leaderboard_sessions',
      '0 4 * * *',
      'delete from public.leaderboard_sessions where expires_at < now()'
    );
  end if;
end
$cron$;
