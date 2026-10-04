-- Security and access hardening after the initial schema.

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select r.name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = (select auth.uid())
    and p.active = true
$$;

revoke all on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$
  select coalesce(public.current_role() = 'administrator'::public.app_role, false)
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.product_recipes enable row level security;
alter table public.recipe_items enable row level security;

create policy "authenticated read roles" on public.roles for select to authenticated using (true);
create policy "admins manage roles" on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read permissions" on public.permissions for select to authenticated using (true);
create policy "admins manage permissions" on public.permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read role permissions" on public.role_permissions for select to authenticated using (true);
create policy "admins manage role permissions" on public.role_permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read suppliers" on public.suppliers for select to authenticated using (true);
create policy "stock team manage suppliers" on public.suppliers for all to authenticated
using (public.current_role() in ('administrator','manager','stock'))
with check (public.current_role() in ('administrator','manager','stock'));

create policy "staff read product recipes" on public.product_recipes for select to authenticated using (true);
create policy "stock team manage product recipes" on public.product_recipes for all to authenticated
using (public.current_role() in ('administrator','manager','stock'))
with check (public.current_role() in ('administrator','manager','stock'));

create policy "staff read recipe items" on public.recipe_items for select to authenticated using (true);
create policy "stock team manage recipe items" on public.recipe_items for all to authenticated
using (public.current_role() in ('administrator','manager','stock'))
with check (public.current_role() in ('administrator','manager','stock'));

create policy "staff read customers" on public.customers for select to authenticated using (true);
create policy "service team manage customers" on public.customers for all to authenticated
using (public.current_role() in ('administrator','manager','cashier','waiter'))
with check (public.current_role() in ('administrator','manager','cashier','waiter'));

create policy "staff read event checkins" on public.event_checkins for select to authenticated using (true);
create policy "service team manage event checkins" on public.event_checkins for all to authenticated
using (public.current_role() in ('administrator','manager','cashier','waiter'))
with check (public.current_role() in ('administrator','manager','cashier','waiter'));

create policy "management manage restaurant settings" on public.restaurant_settings for all to authenticated
using (public.current_role() in ('administrator','manager'))
with check (public.current_role() in ('administrator','manager'));
create policy "management manage website settings" on public.website_settings for all to authenticated
using (public.current_role() in ('administrator','manager'))
with check (public.current_role() in ('administrator','manager'));
create policy "management manage website gallery" on public.website_gallery for all to authenticated
using (public.current_role() in ('administrator','manager'))
with check (public.current_role() in ('administrator','manager'));

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.stock(product_id, quantity) values (new.product_id, 0)
  on conflict (product_id) do nothing;

  update public.stock
     set quantity = quantity + case
       when new.type in ('entry','return','inventory') then new.quantity
       else -new.quantity
     end,
         updated_at = now()
   where product_id = new.product_id;

  if (select quantity from public.stock where product_id = new.product_id) < 0 then
    raise exception 'Estoque insuficiente para o produto %', new.product_id;
  end if;
  return new;
end;
$$;

revoke all on function public.apply_stock_movement() from public, anon, authenticated;

create or replace function public.generate_reservation_code() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.reservation_code is null then
    new.reservation_code := 'RES-' || lpad(nextval('public.reservation_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

revoke all on function public.generate_reservation_code() from public, anon, authenticated;
