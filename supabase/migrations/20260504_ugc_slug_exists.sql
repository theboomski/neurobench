-- Slug allocation for /api/ugc/next-slug must see all rows; RLS hides closed/unlisted games
-- from anon, causing false "available" and duplicate-key insert failures.
create or replace function public.ugc_slug_taken(p_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.ugc_games
    where slug = p_slug
  );
$$;

revoke all on function public.ugc_slug_taken(text) from public;
grant execute on function public.ugc_slug_taken(text) to anon, authenticated, service_role;
