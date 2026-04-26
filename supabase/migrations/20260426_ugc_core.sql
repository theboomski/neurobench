-- UGC core schema for zazaza.app

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ugc_game_type') then
    create type public.ugc_game_type as enum ('brackets', 'balance');
  end if;
  if not exists (select 1 from pg_type where typname = 'ugc_visibility') then
    create type public.ugc_visibility as enum ('public', 'private', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'ugc_winner_option') then
    create type public.ugc_winner_option as enum ('a', 'b');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ugc_categories (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  "order" int not null default 0
);

create table if not exists public.ugc_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.ugc_game_type not null,
  title text not null,
  description text,
  cover_image_url text,
  category_id bigint references public.ugc_categories(id),
  language text not null default 'en',
  visibility public.ugc_visibility not null default 'public',
  is_nsfw boolean not null default false,
  is_approved boolean not null default true,
  play_count int not null default 0,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ugc_brackets_items (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.ugc_games(id) on delete cascade,
  name text not null,
  image_url text not null,
  win_count int not null default 0,
  match_count int not null default 0,
  "order" int not null default 0
);

create table if not exists public.ugc_balance_options (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.ugc_games(id) on delete cascade,
  option_a text not null,
  option_b text not null,
  round int not null,
  "order" int not null default 0
);

create table if not exists public.ugc_play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.ugc_games(id) on delete cascade,
  played_at timestamptz not null default now(),
  winner_item_id uuid references public.ugc_brackets_items(id) on delete set null,
  winner_option public.ugc_winner_option
);

create index if not exists idx_ugc_games_visibility_created on public.ugc_games (visibility, created_at desc);
create index if not exists idx_ugc_games_type_created on public.ugc_games (type, created_at desc);
create index if not exists idx_ugc_games_category on public.ugc_games (category_id);
create index if not exists idx_ugc_games_language on public.ugc_games (language);
create index if not exists idx_ugc_brackets_items_game on public.ugc_brackets_items (game_id, "order");
create index if not exists idx_ugc_balance_options_game on public.ugc_balance_options (game_id, "order");
create index if not exists idx_ugc_play_history_user_date on public.ugc_play_history (user_id, played_at desc);

insert into public.ugc_categories (name, slug, "order")
values
  ('Kpop', 'kpop', 1),
  ('Celebs', 'celebs', 2),
  ('TV Shows', 'tv-shows', 3),
  ('Beauty', 'beauty', 4),
  ('Sports', 'sports', 5),
  ('Anime', 'anime', 6),
  ('Food', 'food', 7),
  ('Gaming', 'gaming', 8)
on conflict (slug) do update
set name = excluded.name, "order" = excluded."order";

alter table public.profiles enable row level security;
alter table public.ugc_categories enable row level security;
alter table public.ugc_games enable row level security;
alter table public.ugc_brackets_items enable row level security;
alter table public.ugc_balance_options enable row level security;
alter table public.ugc_play_history enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
for select using (true);

drop policy if exists "profiles_own_upsert" on public.profiles;
create policy "profiles_own_upsert" on public.profiles
for all to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "ugc_categories_public_read" on public.ugc_categories;
create policy "ugc_categories_public_read" on public.ugc_categories
for select using (is_active = true);

drop policy if exists "ugc_games_public_read" on public.ugc_games;
create policy "ugc_games_public_read" on public.ugc_games
for select using (
  visibility = 'public'
  and is_approved = true
);

drop policy if exists "ugc_games_owner_read_all" on public.ugc_games;
create policy "ugc_games_owner_read_all" on public.ugc_games
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "ugc_games_owner_insert" on public.ugc_games;
create policy "ugc_games_owner_insert" on public.ugc_games
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_banned = false
  )
);

drop policy if exists "ugc_games_owner_update" on public.ugc_games;
create policy "ugc_games_owner_update" on public.ugc_games
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_banned = false
  )
);

drop policy if exists "ugc_games_owner_delete" on public.ugc_games;
create policy "ugc_games_owner_delete" on public.ugc_games
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "ugc_items_public_read" on public.ugc_brackets_items;
create policy "ugc_items_public_read" on public.ugc_brackets_items
for select using (
  exists (
    select 1 from public.ugc_games g
    where g.id = game_id
      and g.visibility = 'public'
      and g.is_approved = true
  )
);

drop policy if exists "ugc_items_owner_all" on public.ugc_brackets_items;
create policy "ugc_items_owner_all" on public.ugc_brackets_items
for all to authenticated
using (
  exists (
    select 1 from public.ugc_games g
    where g.id = game_id
      and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.ugc_games g
    where g.id = game_id
      and g.user_id = auth.uid()
  )
);

drop policy if exists "ugc_balance_public_read" on public.ugc_balance_options;
create policy "ugc_balance_public_read" on public.ugc_balance_options
for select using (
  exists (
    select 1 from public.ugc_games g
    where g.id = game_id
      and g.visibility = 'public'
      and g.is_approved = true
  )
);

drop policy if exists "ugc_balance_owner_all" on public.ugc_balance_options;
create policy "ugc_balance_owner_all" on public.ugc_balance_options
for all to authenticated
using (
  exists (
    select 1 from public.ugc_games g
    where g.id = game_id
      and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.ugc_games g
    where g.id = game_id
      and g.user_id = auth.uid()
  )
);

drop policy if exists "ugc_history_owner_read" on public.ugc_play_history;
create policy "ugc_history_owner_read" on public.ugc_play_history
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "ugc_history_owner_insert" on public.ugc_play_history;
create policy "ugc_history_owner_insert" on public.ugc_play_history
for insert to authenticated
with check (user_id = auth.uid());

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('brackets', 'brackets', true, 5242880, array['image/jpeg', 'image/png']),
  ('ugc-covers', 'ugc-covers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "brackets_public_read" on storage.objects;
create policy "brackets_public_read" on storage.objects
for select using (bucket_id = 'brackets');

drop policy if exists "ugc_covers_public_read" on storage.objects;
create policy "ugc_covers_public_read" on storage.objects
for select using (bucket_id = 'ugc-covers');

drop policy if exists "brackets_auth_upload" on storage.objects;
create policy "brackets_auth_upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'brackets');

drop policy if exists "ugc_covers_auth_upload" on storage.objects;
create policy "ugc_covers_auth_upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'ugc-covers');
