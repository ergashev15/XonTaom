-- Security hardening and order integrity.
-- Closes privilege escalation through direct REST writes and makes place_order
-- authoritative for prices, stock, minimum order and duplicate submissions.

-- Requests made with a user JWT always have auth.uid(). The SQL Editor and the
-- service role do not, and they are trusted to bypass the owner-level guards.
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is null or public.is_admin();
$$;

-- ---------------------------------------------------------------------------
-- profiles: users may edit display fields only. role, phone, email and
-- onboarding_completed change through security definer functions or by admins.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, first_name, last_name, language) on public.profiles to authenticated;

-- The phone collected during registration is not verified, so uniqueness only
-- lets one account block another person's number.
alter table public.profiles drop constraint if exists profiles_phone_key;
create index if not exists profiles_phone_idx on public.profiles(phone);

-- ---------------------------------------------------------------------------
-- restaurants / menu: owners cannot unblock themselves, change commission or
-- hand the restaurant to another account.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_restaurant_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged() then return new; end if;

  if tg_op = 'INSERT' then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
    new.is_blocked = false;
    new.commission_rate = 10;
    return new;
  end if;

  new.owner_id = old.owner_id;
  new.is_blocked = old.is_blocked;
  new.commission_rate = old.commission_rate;

  if (new.name, new.phone, new.address, new.image_url, new.cuisine)
      is distinct from
     (old.name, old.phone, old.address, old.image_url, old.cuisine)
  then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
  else
    new.approval_status = old.approval_status;
    new.rejection_reason = old.rejection_reason;
    new.reviewed_at = old.reviewed_at;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_menu_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged() then return new; end if;

  if tg_op = 'INSERT' then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
    return new;
  end if;

  new.restaurant_id = old.restaurant_id;

  if (new.category_id, new.name, new.description, new.image_url, new.price)
      is distinct from
     (old.category_id, old.name, old.description, old.image_url, old.price)
  then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
  else
    new.approval_status = old.approval_status;
    new.rejection_reason = old.rejection_reason;
    new.reviewed_at = old.reviewed_at;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables that were exposed through the REST API without row level security.
-- ---------------------------------------------------------------------------
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.banners enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "users manage own favorites" on public.favorites;
create policy "users manage own favorites" on public.favorites
for all using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "public reads visible reviews" on public.reviews;
create policy "public reads visible reviews" on public.reviews
for select using (
  is_visible
  or customer_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
);

drop policy if exists "customers review delivered orders" on public.reviews;
create policy "customers review delivered orders" on public.reviews
for insert with check (
  customer_id = auth.uid()
  and is_visible
  and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.customer_id = auth.uid()
      and o.restaurant_id = reviews.restaurant_id
      and o.status = 'delivered'
  )
);

drop policy if exists "admins moderate reviews" on public.reviews;
create policy "admins moderate reviews" on public.reviews
for update using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews
for delete using (public.is_admin());

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select using (profile_id = auth.uid());

drop policy if exists "users mark own notifications" on public.notifications;
create policy "users mark own notifications" on public.notifications
for update using (profile_id = auth.uid())
with check (profile_id = auth.uid());

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "public reads active banners" on public.banners;
create policy "public reads active banners" on public.banners
for select using (
  public.is_admin()
  or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
);

drop policy if exists "admins manage banners" on public.banners;
create policy "admins manage banners" on public.banners
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
for select using (public.is_admin());

revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- orders: created only through place_order; updates limited to valid status
-- transitions by the restaurant, cancellation by the customer, or an admin.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists client_request_id uuid;
create unique index if not exists orders_customer_request_idx
  on public.orders(customer_id, client_request_id)
  where client_request_id is not null;

drop policy if exists "customers create own orders" on public.orders;
revoke insert, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

drop policy if exists "restaurant updates own orders" on public.orders;
create policy "restaurant updates own orders" on public.orders
for update using (
  public.is_admin()
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
) with check (
  public.is_admin()
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
);

drop policy if exists "customers cancel own orders" on public.orders;
create policy "customers cancel own orders" on public.orders
for update using (
  customer_id = auth.uid() and status in ('new', 'awaiting_confirmation')
) with check (
  customer_id = auth.uid() and status = 'cancelled'
);

drop policy if exists "admins read all orders" on public.orders;
create policy "admins read all orders" on public.orders
for select using (public.is_admin());

create or replace function public.enforce_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  allowed boolean;
begin
  if public.is_privileged() then
    if new.status is distinct from old.status then
      if new.status = 'accepted' and new.accepted_at is null then new.accepted_at = now(); end if;
      if new.status = 'delivered' and new.delivered_at is null then new.delivered_at = now(); end if;
    end if;
    return new;
  end if;

  if (new.customer_id, new.restaurant_id, new.payment_method, new.subtotal, new.delivery_fee,
      new.address_snapshot, new.customer_snapshot, new.note, new.created_at, new.client_request_id)
      is distinct from
     (old.customer_id, old.restaurant_id, old.payment_method, old.subtotal, old.delivery_fee,
      old.address_snapshot, old.customer_snapshot, old.note, old.created_at, old.client_request_id)
  then
    raise exception 'Buyurtma ma’lumotlarini o‘zgartirib bo‘lmaydi.';
  end if;

  -- Timestamps are always decided by the server.
  new.accepted_at = old.accepted_at;
  new.delivered_at = old.delivered_at;

  if new.status = old.status then
    new.rejection_reason = old.rejection_reason;
    return new;
  end if;

  select exists (
    select 1 from public.restaurants r where r.id = old.restaurant_id and r.owner_id = auth.uid()
  ) into is_owner;

  if is_owner then
    allowed := case old.status
      when 'new' then new.status in ('accepted', 'rejected')
      when 'awaiting_confirmation' then new.status in ('accepted', 'rejected')
      when 'accepted' then new.status in ('preparing', 'out_for_delivery', 'cancelled')
      when 'preparing' then new.status in ('out_for_delivery', 'cancelled')
      when 'out_for_delivery' then new.status = 'delivered'
      else false
    end;
  else
    allowed := false;
  end if;

  -- The customer may withdraw an order the restaurant has not answered yet.
  if not allowed then
    allowed := old.customer_id = auth.uid()
      and old.status in ('new', 'awaiting_confirmation')
      and new.status = 'cancelled';
  end if;

  if not allowed then
    raise exception 'Buyurtma holatini bu tarzda o‘zgartirib bo‘lmaydi.';
  end if;

  if new.status = 'rejected' then
    new.rejection_reason = coalesce(nullif(trim(new.rejection_reason), ''), 'Sabab ko‘rsatilmagan');
  else
    new.rejection_reason = null;
  end if;
  if new.status = 'accepted' then new.accepted_at = now(); end if;
  if new.status = 'delivered' then new.delivered_at = now(); end if;
  return new;
end;
$$;

drop trigger if exists orders_enforce_update on public.orders;
create trigger orders_enforce_update
before update on public.orders
for each row execute function public.enforce_order_update();

-- Stock reserved by place_order goes back on sale when the order falls through.
create or replace function public.restore_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('rejected', 'cancelled') and old.status not in ('rejected', 'cancelled') then
    update public.menu_items mi
    set stock = mi.stock + returned.quantity
    from (
      select oi.menu_item_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      where oi.order_id = new.id and oi.menu_item_id is not null
      group by oi.menu_item_id
    ) returned
    where mi.id = returned.menu_item_id and mi.stock is not null;
  end if;
  return null;
end;
$$;

drop trigger if exists orders_restore_stock on public.orders;
create trigger orders_restore_stock
after update of status on public.orders
for each row execute function public.restore_order_stock();

-- ---------------------------------------------------------------------------
-- place_order: every requested item must be orderable, stock is reserved,
-- the restaurant minimum is enforced and retries do not create duplicates.
-- ---------------------------------------------------------------------------
drop function if exists public.place_order(uuid, public.payment_method, jsonb, jsonb, text, jsonb);

create or replace function public.place_order(
  p_restaurant_id uuid,
  p_payment_method public.payment_method,
  p_address_snapshot jsonb,
  p_customer_snapshot jsonb,
  p_note text,
  p_items jsonb,
  p_client_request_id uuid default null
)
returns table (id uuid, order_number bigint, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_order public.orders;
  v_restaurant public.restaurants;
  v_subtotal bigint;
  v_requested integer;
  v_matched integer;
begin
  if auth.uid() is null then raise exception 'Buyurtma berish uchun hisobga kiring.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Savatcha bo‘sh.';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Savatchada juda ko‘p taom bor.'; end if;
  if length(trim(coalesce(p_address_snapshot->>'address', ''))) < 4 then raise exception 'Yetkazish manzilini kiriting.'; end if;
  if length(regexp_replace(coalesce(p_customer_snapshot->>'phone', ''), '[^0-9]', '', 'g')) < 9 then
    raise exception 'Telefon raqamini to‘liq kiriting.';
  end if;

  if p_client_request_id is not null then
    select o.* into v_order
    from public.orders o
    where o.customer_id = auth.uid() and o.client_request_id = p_client_request_id;
    if found then
      return query select v_order.id, v_order.order_number, v_order.created_at;
      return;
    end if;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) entry
    where entry->>'menu_item_id' is null
      or coalesce((entry->>'quantity')::integer, 0) not between 1 and 50
  ) then
    raise exception 'Taom miqdori noto‘g‘ri.';
  end if;

  select r.* into v_restaurant
  from public.restaurants r
  where r.id = p_restaurant_id and r.is_open and not r.is_blocked and r.approval_status = 'approved';
  if not found then raise exception 'Restoran hozir buyurtma qabul qilmayapti.'; end if;

  -- Lock the ordered rows so two simultaneous orders cannot oversell stock.
  perform 1
  from public.menu_items mi
  where mi.id in (select (entry->>'menu_item_id')::uuid from jsonb_array_elements(p_items) entry)
  order by mi.id
  for update;

  select count(*) into v_requested
  from (select distinct (entry->>'menu_item_id')::uuid from jsonb_array_elements(p_items) entry) requested;

  select count(*), sum(mi.price * wanted.quantity)
  into v_matched, v_subtotal
  from (
    select (entry->>'menu_item_id')::uuid as menu_item_id, sum((entry->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) entry
    group by 1
  ) wanted
  join public.menu_items mi on mi.id = wanted.menu_item_id
  where mi.restaurant_id = p_restaurant_id
    and mi.is_available
    and mi.approval_status = 'approved'
    and (mi.stock is null or mi.stock >= wanted.quantity);

  if v_matched <> v_requested or v_subtotal is null then
    raise exception 'Savatchadagi ayrim taomlar hozir mavjud emas. Savatchani yangilang.';
  end if;
  if v_subtotal < v_restaurant.min_order then
    raise exception 'Minimal buyurtma summasi: % so‘m.', v_restaurant.min_order;
  end if;

  insert into public.orders (
    customer_id, restaurant_id, payment_method, subtotal, delivery_fee,
    address_snapshot, customer_snapshot, note, client_request_id
  )
  values (
    auth.uid(), v_restaurant.id, p_payment_method, v_subtotal, v_restaurant.delivery_fee,
    p_address_snapshot, p_customer_snapshot, nullif(trim(p_note), ''), p_client_request_id
  )
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity, note)
  select v_order.id, mi.id, mi.name, mi.price, (entry->>'quantity')::integer, nullif(trim(entry->>'note'), '')
  from jsonb_array_elements(p_items) entry
  join public.menu_items mi on mi.id = (entry->>'menu_item_id')::uuid;

  update public.menu_items mi
  set stock = mi.stock - wanted.quantity
  from (
    select (entry->>'menu_item_id')::uuid as menu_item_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) entry
    group by 1
  ) wanted
  where mi.id = wanted.menu_item_id and mi.stock is not null;

  return query select v_order.id, v_order.order_number, v_order.created_at;
end;
$$;

revoke all on function public.place_order(uuid, public.payment_method, jsonb, jsonb, text, jsonb, uuid) from public;
grant execute on function public.place_order(uuid, public.payment_method, jsonb, jsonb, text, jsonb, uuid) to authenticated;
