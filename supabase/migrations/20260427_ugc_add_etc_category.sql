insert into public.ugc_categories (name, slug, "order")
values ('Etc', 'etc', 9)
on conflict (slug) do update
set name = excluded.name, "order" = excluded."order";
