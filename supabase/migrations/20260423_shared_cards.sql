create table if not exists public.shared_cards (
  id text primary key,
  image_url text not null,
  created_at timestamptz default now()
);

alter table public.shared_cards enable row level security;

drop policy if exists "shared_cards_public_read" on public.shared_cards;
create policy "shared_cards_public_read"
on public.shared_cards
for select
to anon, authenticated
using (true);

drop policy if exists "shared_cards_public_insert" on public.shared_cards;
create policy "shared_cards_public_insert"
on public.shared_cards
for insert
to anon, authenticated
with check (true);

insert into storage.buckets (id, name, public)
values ('cards', 'cards', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "cards_public_read" on storage.objects;
create policy "cards_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'cards');

drop policy if exists "cards_public_insert" on storage.objects;
create policy "cards_public_insert"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'cards');
