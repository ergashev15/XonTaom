create type public.approval_status as enum ('pending', 'approved', 'rejected');

alter table public.restaurants
  add column if not exists cuisine text not null default 'Milliy taomlar',
  add column if not exists approval_status public.approval_status not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.menu_items
  add column if not exists stock integer check (stock is null or stock >= 0),
  add column if not exists prep_minutes integer not null default 25 check (prep_minutes > 0),
  add column if not exists approval_status public.approval_status not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Records created before the approval workflow are treated as already reviewed.
update public.restaurants set approval_status = 'approved' where reviewed_at is null;
update public.menu_items set approval_status = 'approved' where reviewed_at is null;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, phone)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'XonTaom foydalanuvchisi'),
    coalesce(new.phone, new.email, new.id::text)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, role, name, phone)
select
  id,
  'customer',
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'XonTaom foydalanuvchisi'),
  coalesce(phone, email, id::text)
from auth.users
on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.require_restaurant_reapproval()
returns trigger
language plpgsql
as $$
begin
  if new.approval_status = old.approval_status and
    (new.name, new.phone, new.address, new.image_url, new.cuisine)
      is distinct from
    (old.name, old.phone, old.address, old.image_url, old.cuisine)
  then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
  end if;
  return new;
end;
$$;

create or replace function public.require_menu_reapproval()
returns trigger
language plpgsql
as $$
begin
  if new.approval_status = old.approval_status and
    (new.category_id, new.name, new.description, new.image_url, new.price)
      is distinct from
    (old.category_id, old.name, old.description, old.image_url, old.price)
  then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_touch_updated_at on public.restaurants;
create trigger restaurants_touch_updated_at before update on public.restaurants
for each row execute function public.touch_updated_at();

drop trigger if exists restaurants_require_reapproval on public.restaurants;
create trigger restaurants_require_reapproval before update on public.restaurants
for each row execute function public.require_restaurant_reapproval();

drop trigger if exists menu_items_touch_updated_at on public.menu_items;
create trigger menu_items_touch_updated_at before update on public.menu_items
for each row execute function public.touch_updated_at();

drop trigger if exists menu_items_require_reapproval on public.menu_items;
create trigger menu_items_require_reapproval before update on public.menu_items
for each row execute function public.require_menu_reapproval();

alter table public.restaurant_hours enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public reads active restaurants" on public.restaurants;
create policy "public reads approved restaurants" on public.restaurants
for select using (
  (approval_status = 'approved' and not is_blocked)
  or owner_id = auth.uid()
  or public.is_admin()
);

create policy "owners create restaurants" on public.restaurants
for insert with check (owner_id = auth.uid());

create policy "owners update restaurants" on public.restaurants
for update using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "public reads restaurant hours" on public.restaurant_hours
for select using (exists (
  select 1 from public.restaurants r
  where r.id = restaurant_id
    and ((r.approval_status = 'approved' and not r.is_blocked) or r.owner_id = auth.uid() or public.is_admin())
));

create policy "owners manage restaurant hours" on public.restaurant_hours
for all using (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
)) with check (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
));

create policy "public reads approved categories" on public.categories
for select using (exists (
  select 1 from public.restaurants r
  where r.id = restaurant_id
    and ((r.approval_status = 'approved' and not r.is_blocked) or r.owner_id = auth.uid() or public.is_admin())
));

create policy "owners manage categories" on public.categories
for all using (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
)) with check (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
));

create policy "public reads approved menu" on public.menu_items
for select using (
  approval_status = 'approved'
  and exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.approval_status = 'approved' and not r.is_blocked
  )
  or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "owners create menu" on public.menu_items
for insert with check (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
));

create policy "owners update menu" on public.menu_items
for update using (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
)) with check (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
));

create policy "owners delete menu" on public.menu_items
for delete using (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and (r.owner_id = auth.uid() or public.is_admin())
));

create policy "customers read own order items" on public.order_items
for select using (exists (
  select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
));

create policy "restaurants read own order items" on public.order_items
for select using (exists (
  select 1 from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where o.id = order_id and (r.owner_id = auth.uid() or public.is_admin())
));

create or replace function public.place_order(
  p_restaurant_id uuid,
  p_payment_method public.payment_method,
  p_address_snapshot jsonb,
  p_customer_snapshot jsonb,
  p_note text,
  p_items jsonb
)
returns table (id uuid, order_number bigint, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_order public.orders;
  expected_subtotal bigint;
  item jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Order must contain at least one item'; end if;

  select sum(mi.price * greatest(1, (entry->>'quantity')::integer))
  into expected_subtotal
  from jsonb_array_elements(p_items) entry
  join public.menu_items mi on mi.id = (entry->>'menu_item_id')::uuid
  where mi.restaurant_id = p_restaurant_id
    and mi.is_available
    and mi.approval_status = 'approved';

  if expected_subtotal is null then raise exception 'No available menu items'; end if;

  insert into public.orders (
    customer_id, restaurant_id, payment_method, subtotal, delivery_fee,
    address_snapshot, customer_snapshot, note
  )
  select auth.uid(), r.id, p_payment_method, expected_subtotal, r.delivery_fee,
    p_address_snapshot, p_customer_snapshot, nullif(trim(p_note), '')
  from public.restaurants r
  where r.id = p_restaurant_id and r.is_open and not r.is_blocked and r.approval_status = 'approved'
  returning * into created_order;

  if created_order.id is null then raise exception 'Restaurant is unavailable'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity, note)
    select created_order.id, mi.id, mi.name, mi.price,
      greatest(1, (item->>'quantity')::integer), nullif(trim(item->>'note'), '')
    from public.menu_items mi
    where mi.id = (item->>'menu_item_id')::uuid
      and mi.restaurant_id = p_restaurant_id
      and mi.is_available
      and mi.approval_status = 'approved';
  end loop;

  return query select created_order.id, created_order.order_number, created_order.created_at;
end;
$$;

grant execute on function public.place_order(uuid, public.payment_method, jsonb, jsonb, text, jsonb) to authenticated;

insert into storage.buckets (id, name, public)
values ('restaurant-media', 'restaurant-media', true)
on conflict (id) do update set public = true;

create policy "public reads restaurant media" on storage.objects
for select using (bucket_id = 'restaurant-media');

create policy "owners upload restaurant media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners update restaurant media" on storage.objects
for update to authenticated using (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners delete restaurant media" on storage.objects
for delete to authenticated using (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = auth.uid()::text
);

alter publication supabase_realtime add table public.restaurants, public.categories, public.menu_items;
