-- Indexes, integrity rules and the server-side tables behind features that
-- used to live only on the device (applications, campaigns, staff, reviews).

-- ---------------------------------------------------------------------------
-- Indexes for foreign keys used by row level security and embedded reads.
-- ---------------------------------------------------------------------------
create index if not exists restaurants_owner_idx on public.restaurants(owner_id);
create index if not exists categories_restaurant_idx on public.categories(restaurant_id, sort_order);
create index if not exists menu_items_category_idx on public.menu_items(category_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists addresses_profile_idx on public.addresses(profile_id);
create index if not exists reviews_restaurant_idx on public.reviews(restaurant_id, created_at desc);
create index if not exists reviews_customer_idx on public.reviews(customer_id);
create index if not exists favorites_restaurant_idx on public.favorites(restaurant_id);
create index if not exists notifications_profile_idx on public.notifications(profile_id, created_at desc);
create index if not exists orders_pending_idx on public.orders(created_at) where status in ('new', 'awaiting_confirmation');

-- ---------------------------------------------------------------------------
-- Read policies on the hot paths. Wrapping auth.uid() and is_admin() in a
-- scalar subquery lets Postgres evaluate them once per statement, not per row.
-- ---------------------------------------------------------------------------
drop policy if exists "public reads approved restaurants" on public.restaurants;
create policy "public reads approved restaurants" on public.restaurants
for select using (
  (approval_status = 'approved' and not is_blocked)
  or owner_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists "public reads restaurant hours" on public.restaurant_hours;
create policy "public reads restaurant hours" on public.restaurant_hours
for select using (
  (select public.is_admin())
  or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
      and ((r.approval_status = 'approved' and not r.is_blocked) or r.owner_id = (select auth.uid()))
  )
);

drop policy if exists "public reads approved categories" on public.categories;
create policy "public reads approved categories" on public.categories
for select using (
  (select public.is_admin())
  or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
      and ((r.approval_status = 'approved' and not r.is_blocked) or r.owner_id = (select auth.uid()))
  )
);

drop policy if exists "public reads approved menu" on public.menu_items;
create policy "public reads approved menu" on public.menu_items
for select using (
  (select public.is_admin())
  or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
      and (
        r.owner_id = (select auth.uid())
        or (menu_items.approval_status = 'approved' and r.approval_status = 'approved' and not r.is_blocked)
      )
  )
);

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders
for select using (customer_id = (select auth.uid()));

drop policy if exists "restaurant reads own orders" on public.orders;
create policy "restaurant reads own orders" on public.orders
for select using (exists (
  select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid())
));

drop policy if exists "admins read all orders" on public.orders;
create policy "admins read all orders" on public.orders
for select using ((select public.is_admin()));

drop policy if exists "customers read own order items" on public.order_items;
create policy "customers read own order items" on public.order_items
for select using (exists (
  select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())
));

drop policy if exists "restaurants read own order items" on public.order_items;
create policy "restaurants read own order items" on public.order_items
for select using (
  (select public.is_admin())
  or exists (
    select 1 from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.id = order_id and r.owner_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- categories: the app addresses a category by name, so names must be unique
-- per restaurant. Merge existing duplicates before adding the constraint.
-- ---------------------------------------------------------------------------
with ranked as (
  select id, first_value(id) over (
    partition by restaurant_id, lower(trim(name)) order by sort_order, id
  ) as keep_id
  from public.categories
)
update public.menu_items mi
set category_id = ranked.keep_id
from ranked
where mi.category_id = ranked.id and ranked.id <> ranked.keep_id;

with ranked as (
  select id, first_value(id) over (
    partition by restaurant_id, lower(trim(name)) order by sort_order, id
  ) as keep_id
  from public.categories
)
delete from public.categories c
using ranked
where c.id = ranked.id and ranked.id <> ranked.keep_id;

create unique index if not exists categories_restaurant_name_idx
  on public.categories(restaurant_id, lower(trim(name)));

-- ---------------------------------------------------------------------------
-- orders: working hours and a per-customer rate limit, checked for every
-- insert so place_order cannot be used to flood a restaurant or lock stock.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  local_now timestamp := now() at time zone 'Asia/Tashkent';
  today public.restaurant_hours;
  recent integer;
  pending integer;
begin
  if auth.uid() is null then return new; end if;

  -- Restaurants without a schedule rely on the manual open/closed switch only.
  select h.* into today
  from public.restaurant_hours h
  where h.restaurant_id = new.restaurant_id and h.weekday = extract(dow from local_now)::smallint;

  if found then
    if today.is_closed then raise exception 'Restoran bugun ishlamaydi.'; end if;
    if today.opens_at is not null and today.closes_at is not null then
      if today.opens_at <= today.closes_at then
        if local_now::time < today.opens_at or local_now::time >= today.closes_at then
          raise exception 'Restoran hozir yopiq. Ish vaqti: %–%.', to_char(today.opens_at, 'HH24:MI'), to_char(today.closes_at, 'HH24:MI');
        end if;
      -- A schedule such as 18:00–02:00 runs past midnight.
      elsif local_now::time < today.opens_at and local_now::time >= today.closes_at then
        raise exception 'Restoran hozir yopiq. Ish vaqti: %–%.', to_char(today.opens_at, 'HH24:MI'), to_char(today.closes_at, 'HH24:MI');
      end if;
    end if;
  end if;

  select count(*) into recent
  from public.orders o
  where o.customer_id = new.customer_id and o.created_at > now() - interval '10 minutes';
  if recent >= 5 then raise exception 'Juda ko‘p buyurtma yuborildi. Bir necha daqiqadan keyin urinib ko‘ring.'; end if;

  select count(*) into pending
  from public.orders o
  where o.customer_id = new.customer_id and o.status in ('new', 'awaiting_confirmation');
  if pending >= 3 then raise exception 'Avvalgi buyurtmalaringiz hali tasdiqlanmagan. Restoran javobini kuting.'; end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_insert on public.orders;
create trigger orders_enforce_insert
before insert on public.orders
for each row execute function public.enforce_order_insert();

-- Orders a restaurant never answered are cancelled so the customer is not
-- left waiting and reserved stock returns to the menu.
create or replace function public.expire_unanswered_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired integer;
begin
  update public.orders
  set status = 'cancelled', rejection_reason = 'Restoran belgilangan vaqtda javob bermadi'
  where status in ('new', 'awaiting_confirmation') and created_at < now() - interval '10 minutes';
  get diagnostics expired = row_count;
  return expired;
end;
$$;

revoke all on function public.expire_unanswered_orders() from public, anon, authenticated;

-- Runs every minute when pg_cron is enabled (Dashboard → Database → Extensions).
-- Re-run this block after enabling the extension.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-unanswered-orders', '* * * * *', 'select public.expire_unanswered_orders()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit trail for the changes that matter in a dispute.
-- ---------------------------------------------------------------------------
create or replace function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_data jsonb;
  after_data jsonb;
begin
  if tg_table_name = 'orders' then
    if new.status is not distinct from old.status then return null; end if;
    before_data := jsonb_build_object('status', old.status);
    after_data := jsonb_build_object('status', new.status, 'rejection_reason', new.rejection_reason);
  elsif tg_table_name = 'restaurants' then
    if (new.is_blocked, new.approval_status, new.commission_rate, new.owner_id)
       is not distinct from (old.is_blocked, old.approval_status, old.commission_rate, old.owner_id) then return null; end if;
    before_data := jsonb_build_object('is_blocked', old.is_blocked, 'approval_status', old.approval_status, 'commission_rate', old.commission_rate, 'owner_id', old.owner_id);
    after_data := jsonb_build_object('is_blocked', new.is_blocked, 'approval_status', new.approval_status, 'commission_rate', new.commission_rate, 'owner_id', new.owner_id);
  elsif tg_table_name = 'profiles' then
    if new.role is not distinct from old.role then return null; end if;
    before_data := jsonb_build_object('role', old.role);
    after_data := jsonb_build_object('role', new.role);
  else
    return null;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), 'update', tg_table_name, new.id::text, before_data, after_data);
  return null;
end;
$$;

drop trigger if exists orders_audit on public.orders;
create trigger orders_audit after update on public.orders
for each row execute function public.audit_change();

drop trigger if exists restaurants_audit on public.restaurants;
create trigger restaurants_audit after update on public.restaurants
for each row execute function public.audit_change();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit after update on public.profiles
for each row execute function public.audit_change();

-- ---------------------------------------------------------------------------
-- Storage: bound uploads, and keep identity documents out of the public bucket.
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'restaurant-media';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-documents', 'restaurant-documents', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false;

drop policy if exists "applicants upload own documents" on storage.objects;
create policy "applicants upload own documents" on storage.objects
for insert to authenticated with check (
  bucket_id = 'restaurant-documents' and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "applicants and admins read documents" on storage.objects;
create policy "applicants and admins read documents" on storage.objects
for select to authenticated using (
  bucket_id = 'restaurant-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- ---------------------------------------------------------------------------
-- Restaurant applications.
-- ---------------------------------------------------------------------------
create table if not exists public.restaurant_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  owner_name text not null check (length(trim(owner_name)) >= 3),
  restaurant_name text not null check (length(trim(restaurant_name)) >= 3),
  phone text not null,
  address text not null,
  hours text not null default '',
  cuisine text not null default 'Milliy taomlar',
  logo_url text,
  image_url text,
  document_path text not null,
  delivery_fee bigint not null default 0 check (delivery_fee >= 0),
  min_order bigint not null default 0 check (min_order >= 0),
  status public.approval_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_applications_status_idx on public.restaurant_applications(status, created_at desc);
create unique index if not exists restaurant_applications_one_pending_idx
  on public.restaurant_applications(applicant_id) where status = 'pending';

alter table public.restaurant_applications enable row level security;

drop policy if exists "applicants read own applications" on public.restaurant_applications;
create policy "applicants read own applications" on public.restaurant_applications
for select using (applicant_id = (select auth.uid()) or (select public.is_admin()));

-- Applicants can only file a pending application; the review outcome is
-- written by review_restaurant_application.
drop policy if exists "applicants submit applications" on public.restaurant_applications;
create policy "applicants submit applications" on public.restaurant_applications
for insert to authenticated with check (
  applicant_id = (select auth.uid())
  and status = 'pending'
  and rejection_reason is null
  and reviewed_at is null
  and restaurant_id is null
);

revoke update, delete on public.restaurant_applications from anon, authenticated;

create or replace function public.review_restaurant_application(
  p_application_id uuid,
  p_approve boolean,
  p_rejection_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application public.restaurant_applications;
  created_id uuid;
  hours_match text[];
begin
  if not public.is_admin() then raise exception 'Faqat administrator arizani ko‘rib chiqa oladi.'; end if;

  select a.* into application
  from public.restaurant_applications a
  where a.id = p_application_id
  for update;
  if not found then raise exception 'Ariza topilmadi.'; end if;
  if application.status <> 'pending' then raise exception 'Bu ariza allaqachon ko‘rib chiqilgan.'; end if;

  if not p_approve then
    update public.restaurant_applications
    set status = 'rejected',
        rejection_reason = coalesce(nullif(trim(p_rejection_reason), ''), 'Ma’lumotlar yetarli emas'),
        reviewed_at = now()
    where id = p_application_id;
    return null;
  end if;

  insert into public.restaurants (
    owner_id, name, phone, address, image_url, cuisine, is_open,
    min_order, delivery_fee, approval_status, reviewed_at
  )
  values (
    application.applicant_id, trim(application.restaurant_name), application.phone, application.address,
    coalesce(application.image_url, application.logo_url), application.cuisine, false,
    application.min_order, application.delivery_fee, 'approved', now()
  )
  returning id into created_id;

  hours_match := regexp_match(application.hours, '^\s*([01]\d|2[0-3]):([0-5]\d)\s*[–-]\s*([01]\d|2[0-3]):([0-5]\d)\s*$');
  if hours_match is not null then
    insert into public.restaurant_hours (restaurant_id, weekday, opens_at, closes_at, is_closed)
    select created_id, weekday,
      (hours_match[1] || ':' || hours_match[2])::time,
      (hours_match[3] || ':' || hours_match[4])::time,
      false
    from generate_series(0, 6) as weekday;
  end if;

  update public.restaurant_applications
  set status = 'approved', rejection_reason = null, reviewed_at = now(), restaurant_id = created_id
  where id = p_application_id;

  return created_id;
end;
$$;

revoke all on function public.review_restaurant_application(uuid, boolean, text) from public, anon;
grant execute on function public.review_restaurant_application(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Campaigns (banners, discounts, promo codes) and restaurant staff records.
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  -- null means a platform-wide campaign managed by administrators.
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  type text not null check (type in ('banner', 'discount', 'promo')),
  title text not null check (length(trim(title)) >= 3),
  code text,
  discount_percent integer check (discount_percent is null or discount_percent between 0 and 90),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_restaurant_idx on public.campaigns(restaurant_id);
alter table public.campaigns enable row level security;

drop policy if exists "public reads active campaigns" on public.campaigns;
create policy "public reads active campaigns" on public.campaigns
for select using (
  is_active
  or (select public.is_admin())
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);

drop policy if exists "owners and admins manage campaigns" on public.campaigns;
create policy "owners and admins manage campaigns" on public.campaigns
for all to authenticated using (
  (select public.is_admin())
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
) with check (
  (select public.is_admin())
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);

create table if not exists public.restaurant_staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (length(trim(name)) >= 2),
  phone text not null,
  role text not null check (role in ('owner', 'administrator', 'operator', 'cook')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_staff_restaurant_idx on public.restaurant_staff(restaurant_id);
alter table public.restaurant_staff enable row level security;

drop policy if exists "owners and admins manage staff" on public.restaurant_staff;
create policy "owners and admins manage staff" on public.restaurant_staff
for all to authenticated using (
  (select public.is_admin())
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
) with check (
  (select public.is_admin())
  or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);

-- ---------------------------------------------------------------------------
-- Reviews: customer name snapshot, restaurant replies and public ratings.
-- ---------------------------------------------------------------------------
alter table public.reviews
  add column if not exists customer_name text not null default 'Mijoz',
  add column if not exists reply text,
  add column if not exists replied_at timestamptz;

-- Until 0005 this table accepted anonymous writes; rows without an order or
-- an author cannot be genuine reviews.
delete from public.reviews where order_id is null or customer_id is null or restaurant_id is null;

alter table public.reviews
  alter column order_id set not null,
  alter column customer_id set not null,
  alter column restaurant_id set not null;

-- Profiles are private, so the display name is copied onto the review.
create or replace function public.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  new.customer_name := coalesce(
    (select nullif(trim(coalesce(p.first_name, split_part(p.name, ' ', 1))), '') from public.profiles p where p.id = new.customer_id),
    'Mijoz'
  );
  new.reply := null;
  new.replied_at := null;
  new.comment := nullif(trim(new.comment), '');
  return new;
end;
$$;

drop trigger if exists reviews_prepare on public.reviews;
create trigger reviews_prepare
before insert on public.reviews
for each row execute function public.prepare_review();

create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(p_reply, ''))) < 2 then raise exception 'Javob matnini kiriting.'; end if;

  update public.reviews rv
  set reply = trim(p_reply), replied_at = now()
  where rv.id = p_review_id
    and (
      public.is_admin()
      or exists (select 1 from public.restaurants r where r.id = rv.restaurant_id and r.owner_id = auth.uid())
    );
  if not found then raise exception 'Sharh topilmadi yoki unga javob berish huquqi yo‘q.'; end if;
end;
$$;

revoke all on function public.reply_to_review(uuid, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- Aggregated on purpose without row level security: it exposes only the
-- average and the count of visible reviews.
create or replace view public.restaurant_ratings as
select restaurant_id, round(avg(rating), 1) as rating, count(*)::integer as reviews
from public.reviews
where is_visible
group by restaurant_id;

grant select on public.restaurant_ratings to anon, authenticated;
