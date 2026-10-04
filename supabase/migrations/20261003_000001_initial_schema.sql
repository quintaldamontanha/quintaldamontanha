create extension if not exists pgcrypto;

create type public.app_role as enum ('administrator','manager','cashier','waiter','stock');
create type public.command_status as enum ('open','payment','finished','cancelled');
create type public.table_status as enum ('free','occupied','reserved','awaiting_payment');
create type public.reservation_status as enum ('pending','confirmed','paid','cancelled','attended','no_show');
create type public.stock_movement_type as enum ('entry','sale','loss','internal_consumption','adjustment','return','inventory');
create type public.cash_movement_type as enum ('sale','withdrawal','supply','cancellation','refund');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.app_role unique not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role_id uuid references public.roles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trade_name text not null default 'Quinta da Montanha',
  document text,
  address text,
  phone text,
  whatsapp text,
  instagram text,
  opening_hours jsonb not null default '{}'::jsonb,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trade_name text,
  document text,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  barcode text unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id),
  supplier_id uuid references public.suppliers(id),
  unit text not null default 'un',
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  minimum_stock numeric(12,3) not null default 0,
  image_url text,
  active boolean not null default true,
  show_on_menu boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.stock (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity numeric(12,3) not null default 0,
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity numeric(12,3) not null check (quantity > 0),
  type public.stock_movement_type not null,
  reason text,
  unit_cost numeric(12,2),
  related_document text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.product_recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid unique not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.product_recipes(id) on delete cascade,
  ingredient_product_id uuid not null references public.products(id),
  quantity numeric(12,3) not null check (quantity > 0),
  unique(recipe_id, ingredient_product_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp text,
  document text,
  email text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  seats integer not null default 4 check (seats > 0),
  sector text,
  status public.table_status not null default 'free',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commands (
  id uuid primary key default gen_random_uuid(),
  number bigint generated by default as identity unique,
  table_id uuid references public.tables(id),
  waiter_id uuid references auth.users(id),
  status public.command_status not null default 'open',
  service_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid references auth.users(id)
);

create table public.command_items (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references public.commands(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  opening_amount numeric(12,2) not null default 0,
  closed_by uuid references auth.users(id),
  closed_at timestamptz,
  expected_cash numeric(12,2),
  informed_cash numeric(12,2),
  difference numeric(12,2),
  status text not null default 'open' check (status in ('open','closed'))
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers(id),
  type public.cash_movement_type not null,
  amount numeric(12,2) not null check (amount >= 0),
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  number bigint generated by default as identity unique,
  command_id uuid references public.commands(id),
  customer_id uuid references public.customers(id),
  cash_register_id uuid references public.cash_registers(id),
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  service_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'completed' check (status in ('completed','cancelled','refunded')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(12,3) not null,
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null
);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  method text not null check (method in ('cash','pix','debit_card','credit_card','voucher','courtesy','other')),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  event_date date not null,
  start_time time,
  attraction text,
  price numeric(12,2) not null default 0,
  capacity integer not null default 0 check (capacity >= 0),
  location text,
  notes text,
  status text not null default 'draft' check (status in ('draft','published','sold_out','cancelled','finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text unique,
  customer_id uuid references public.customers(id),
  customer_name text not null,
  phone text,
  reservation_date date not null,
  reservation_time time,
  party_size integer not null check (party_size > 0),
  table_id uuid references public.tables(id),
  notes text,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.event_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text unique,
  event_id uuid not null references public.events(id),
  customer_id uuid references public.customers(id),
  name text not null,
  phone text,
  whatsapp text,
  document text,
  email text,
  party_size integer not null check (party_size > 0),
  notes text,
  status public.reservation_status not null default 'pending',
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  event_reservation_id uuid unique not null references public.event_reservations(id),
  checked_in_by uuid references auth.users(id),
  checked_in_at timestamptz not null default now()
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income','expense')),
  category text,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  sale_id uuid references public.sales(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  month date unique not null,
  revenue_target numeric(12,2) not null check (revenue_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.website_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.website_gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  alt_text text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.roles(name,label) values
 ('administrator','Administrador'),('manager','Gerente'),('cashier','Caixa'),('waiter','Garçom'),('stock','Estoque')
on conflict do nothing;

create or replace function public.current_role() returns public.app_role
language sql stable security invoker set search_path = public
as $$
  select r.name from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.active=true
$$;

create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = public
as $$ select coalesce(public.current_role()='administrator',false) $$;

alter table public.profiles enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customers enable row level security;
alter table public.tables enable row level security;
alter table public.commands enable row level security;
alter table public.command_items enable row level security;
alter table public.cash_registers enable row level security;
alter table public.cash_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.events enable row level security;
alter table public.reservations enable row level security;
alter table public.event_reservations enable row level security;
alter table public.event_checkins enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.goals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.website_settings enable row level security;
alter table public.website_gallery enable row level security;

create policy "profiles self read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public active menu products" on public.products for select to anon, authenticated using (active=true and show_on_menu=true or auth.uid() is not null);
create policy "public active categories" on public.categories for select to anon, authenticated using (active=true or auth.uid() is not null);
create policy "public published events" on public.events for select to anon, authenticated using (status='published' or auth.uid() is not null);
create policy "public gallery" on public.website_gallery for select to anon, authenticated using (active=true or auth.uid() is not null);
create policy "public website settings" on public.website_settings for select to anon, authenticated using (true);
create policy "public restaurant settings" on public.restaurant_settings for select to anon, authenticated using (true);

create policy "authenticated manage categories" on public.categories for all to authenticated using (public.current_role() in ('administrator','manager','stock')) with check (public.current_role() in ('administrator','manager','stock'));
create policy "authenticated manage products" on public.products for all to authenticated using (public.current_role() in ('administrator','manager','stock')) with check (public.current_role() in ('administrator','manager','stock'));
create policy "authenticated stock read" on public.stock for select to authenticated using (true);
create policy "stock team manage stock" on public.stock for all to authenticated using (public.current_role() in ('administrator','manager','stock')) with check (public.current_role() in ('administrator','manager','stock'));
create policy "stock movements read" on public.stock_movements for select to authenticated using (true);
create policy "stock movements insert" on public.stock_movements for insert to authenticated with check (public.current_role() in ('administrator','manager','stock','cashier'));

create policy "staff read commands" on public.commands for select to authenticated using (true);
create policy "staff manage commands" on public.commands for all to authenticated using (public.current_role() in ('administrator','manager','cashier','waiter')) with check (public.current_role() in ('administrator','manager','cashier','waiter'));
create policy "staff manage command items" on public.command_items for all to authenticated using (public.current_role() in ('administrator','manager','cashier','waiter')) with check (public.current_role() in ('administrator','manager','cashier','waiter'));
create policy "staff read tables" on public.tables for select to authenticated using (true);
create policy "staff manage tables" on public.tables for all to authenticated using (public.current_role() in ('administrator','manager','cashier','waiter')) with check (public.current_role() in ('administrator','manager','cashier','waiter'));

create policy "cash staff manage registers" on public.cash_registers for all to authenticated using (public.current_role() in ('administrator','manager','cashier')) with check (public.current_role() in ('administrator','manager','cashier'));
create policy "cash staff manage movements" on public.cash_movements for all to authenticated using (public.current_role() in ('administrator','manager','cashier')) with check (public.current_role() in ('administrator','manager','cashier'));
create policy "staff read sales" on public.sales for select to authenticated using (true);
create policy "cash staff manage sales" on public.sales for all to authenticated using (public.current_role() in ('administrator','manager','cashier')) with check (public.current_role() in ('administrator','manager','cashier'));
create policy "staff read sale items" on public.sale_items for select to authenticated using (true);
create policy "cash staff manage sale items" on public.sale_items for all to authenticated using (public.current_role() in ('administrator','manager','cashier')) with check (public.current_role() in ('administrator','manager','cashier'));
create policy "staff read payments" on public.sale_payments for select to authenticated using (true);
create policy "cash staff manage payments" on public.sale_payments for all to authenticated using (public.current_role() in ('administrator','manager','cashier')) with check (public.current_role() in ('administrator','manager','cashier'));

create policy "public create restaurant reservation" on public.reservations for insert to anon,authenticated with check (true);
create policy "staff manage restaurant reservations" on public.reservations for all to authenticated using (true) with check (true);
create policy "public create event reservation" on public.event_reservations for insert to anon,authenticated with check (true);
create policy "staff manage event reservations" on public.event_reservations for all to authenticated using (true) with check (true);
create policy "staff manage events" on public.events for all to authenticated using (public.current_role() in ('administrator','manager')) with check (public.current_role() in ('administrator','manager'));

create policy "management financial access" on public.financial_transactions for all to authenticated using (public.current_role() in ('administrator','manager')) with check (public.current_role() in ('administrator','manager'));
create policy "management goals access" on public.goals for all to authenticated using (public.current_role() in ('administrator','manager')) with check (public.current_role() in ('administrator','manager'));
create policy "admin audit read" on public.audit_logs for select to authenticated using (public.current_role() in ('administrator','manager'));
create policy "authenticated audit insert" on public.audit_logs for insert to authenticated with check (user_id=auth.uid());

create or replace function public.apply_stock_movement() returns trigger
language plpgsql security invoker set search_path=public
as $$
begin
  insert into public.stock(product_id,quantity) values (new.product_id,0)
  on conflict (product_id) do nothing;
  update public.stock
     set quantity = quantity + case when new.type in ('entry','return','inventory') then new.quantity else -new.quantity end,
         updated_at = now()
   where product_id = new.product_id;
  if (select quantity from public.stock where product_id=new.product_id) < 0 then
    raise exception 'Estoque insuficiente para o produto %', new.product_id;
  end if;
  return new;
end;
$$;

create trigger trg_apply_stock_movement after insert on public.stock_movements
for each row execute function public.apply_stock_movement();

create or replace function public.generate_reservation_code() returns trigger
language plpgsql security invoker set search_path=public
as $$
begin
  if new.reservation_code is null then
    new.reservation_code := 'RES-' || lpad(nextval('public.reservation_code_seq')::text,6,'0');
  end if;
  return new;
end;
$$;

create sequence if not exists public.reservation_code_seq start 1;
create trigger trg_reservation_code before insert on public.reservations for each row execute function public.generate_reservation_code();
create trigger trg_event_reservation_code before insert on public.event_reservations for each row execute function public.generate_reservation_code();
