-- Geographic delivery zones. The client gives immediate feedback, while this
-- trigger is the authoritative check and cannot be bypassed by a modified app.

alter table public.restaurants add column if not exists latitude double precision;
alter table public.restaurants add column if not exists longitude double precision;
alter table public.restaurants add column if not exists delivery_radius_km numeric(6,2);

alter table public.restaurants drop constraint if exists restaurants_latitude_check;
alter table public.restaurants add constraint restaurants_latitude_check check (latitude is null or latitude between -90 and 90);
alter table public.restaurants drop constraint if exists restaurants_longitude_check;
alter table public.restaurants add constraint restaurants_longitude_check check (longitude is null or longitude between -180 and 180);
alter table public.restaurants drop constraint if exists restaurants_delivery_radius_check;
alter table public.restaurants add constraint restaurants_delivery_radius_check check (delivery_radius_km is null or delivery_radius_km between 0.5 and 50);

create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
parallel safe
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create or replace function public.enforce_delivery_zone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r_lat double precision;
  r_lng double precision;
  radius_km double precision;
  address_lat double precision;
  address_lng double precision;
begin
  select latitude, longitude, delivery_radius_km
  into r_lat, r_lng, radius_km
  from public.restaurants where id = new.restaurant_id;

  if r_lat is null or r_lng is null or radius_km is null then
    raise exception 'Restoran yetkazish hududini hali sozlamagan.';
  end if;

  begin
    address_lat := (new.address_snapshot->>'latitude')::double precision;
    address_lng := (new.address_snapshot->>'longitude')::double precision;
  exception when others then
    raise exception 'Yetkazish nuqtasini xaritadan belgilang.';
  end;

  if address_lat is null or address_lng is null
     or address_lat not between -90 and 90
     or address_lng not between -180 and 180 then
    raise exception 'Yetkazish nuqtasini xaritadan belgilang.';
  end if;

  if public.distance_km(r_lat, r_lng, address_lat, address_lng) > radius_km then
    raise exception 'Bu manzil restoranning % km yetkazish hududidan tashqarida.', radius_km;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_delivery_zone on public.orders;
create trigger orders_delivery_zone
before insert on public.orders
for each row execute function public.enforce_delivery_zone();

create or replace function public.update_restaurant_delivery_zone(
  p_restaurant_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180
     or p_radius_km not between 0.5 and 50 then
    raise exception 'Yetkazish hududi qiymatlari noto‘g‘ri.';
  end if;
  update public.restaurants
  set latitude = p_latitude, longitude = p_longitude, delivery_radius_km = p_radius_km
  where id = p_restaurant_id
    and (owner_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Restoran topilmadi yoki ruxsat yo‘q.'; end if;
end;
$$;

revoke all on function public.update_restaurant_delivery_zone(uuid, double precision, double precision, numeric) from public, anon;
grant execute on function public.update_restaurant_delivery_zone(uuid, double precision, double precision, numeric) to authenticated;
