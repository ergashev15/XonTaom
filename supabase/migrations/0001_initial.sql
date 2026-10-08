create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'restaurant', 'admin');
create type public.order_status as enum ('new', 'awaiting_confirmation', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'rejected', 'cancelled');
create type public.payment_method as enum ('cash', 'card_on_delivery');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  name text not null,
  phone text not null unique,
  language text not null default 'uz',
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null,
  phone text not null,
  address text not null,
  image_url text,
  is_open boolean not null default false,
  is_blocked boolean not null default false,
  min_order bigint not null default 0 check (min_order >= 0),
  delivery_fee bigint not null default 0 check (delivery_fee >= 0),
  eta_min integer not null default 30 check (eta_min > 0),
  commission_rate numeric(5,2) not null default 10 check (commission_rate between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.restaurant_hours (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  primary key (restaurant_id, weekday)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  image_url text,
  price bigint not null check (price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  address text not null,
  house text,
  landmark text,
  lat double precision,
  lng double precision
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.profiles(id),
  restaurant_id uuid not null references public.restaurants(id),
  status public.order_status not null default 'awaiting_confirmation',
  payment_method public.payment_method not null,
  subtotal bigint not null check (subtotal >= 0),
  delivery_fee bigint not null check (delivery_fee >= 0),
  total bigint generated always as (subtotal + delivery_fee) stored,
  address_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  note text,
  rejection_reason text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  price_snapshot bigint not null check (price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  note text
);

create table public.favorites (profile_id uuid references public.profiles(id) on delete cascade, restaurant_id uuid references public.restaurants(id) on delete cascade, created_at timestamptz not null default now(), primary key (profile_id, restaurant_id));
create table public.reviews (id uuid primary key default gen_random_uuid(), order_id uuid unique references public.orders(id), customer_id uuid references public.profiles(id), restaurant_id uuid references public.restaurants(id), rating smallint not null check (rating between 1 and 5), comment text, is_visible boolean not null default true, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete cascade, title text not null, body text not null, data jsonb not null default '{}', read_at timestamptz, created_at timestamptz not null default now());
create table public.banners (id uuid primary key default gen_random_uuid(), title text not null, image_url text not null, target_url text, starts_at timestamptz, ends_at timestamptz, is_active boolean not null default false);
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null, entity_type text not null, entity_id text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now());

create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_restaurant_status_idx on public.orders(restaurant_id, status, created_at desc);
create index menu_items_restaurant_idx on public.menu_items(restaurant_id, is_available);

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles read own" on public.profiles for select using (id = auth.uid());
create policy "public reads active restaurants" on public.restaurants for select using (not is_blocked);
create policy "customers read own orders" on public.orders for select using (customer_id = auth.uid());
create policy "customers create own orders" on public.orders for insert with check (customer_id = auth.uid());
create policy "restaurant reads own orders" on public.orders for select using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
create policy "restaurant updates own orders" on public.orders for update using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));

alter publication supabase_realtime add table public.orders, public.notifications;
