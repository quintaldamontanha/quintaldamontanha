alter table public.products
  alter column code set not null;

alter table public.products
  add column if not exists deleted_at timestamptz;

alter table public.products
  drop constraint if exists products_code_not_blank,
  add constraint products_code_not_blank check (btrim(code) <> '');

alter table public.products
  drop constraint if exists products_barcode_not_blank,
  add constraint products_barcode_not_blank check (barcode is null or btrim(barcode) <> '');

create index if not exists products_active_not_deleted_idx
  on public.products (active, category_id, name)
  where deleted_at is null;

create or replace function public.generate_product_code()
returns text
language sql
security invoker
set search_path = ''
as $$
  select lpad((coalesce(max(case when p.code ~ '^[0-9]+$' then p.code::bigint end), 0) + 1)::text, 6, '0')
  from public.products p;
$$;

revoke all on function public.generate_product_code() from public;
grant execute on function public.generate_product_code() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id='product-images'
  and public.current_role() in ('administrator'::public.app_role,'manager'::public.app_role,'stock'::public.app_role)
);

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update"
on storage.objects for update
to authenticated
using (
  bucket_id='product-images'
  and public.current_role() in ('administrator'::public.app_role,'manager'::public.app_role,'stock'::public.app_role)
)
with check (
  bucket_id='product-images'
  and public.current_role() in ('administrator'::public.app_role,'manager'::public.app_role,'stock'::public.app_role)
);

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete"
on storage.objects for delete
to authenticated
using (
  bucket_id='product-images'
  and public.current_role() in ('administrator'::public.app_role,'manager'::public.app_role,'stock'::public.app_role)
);
