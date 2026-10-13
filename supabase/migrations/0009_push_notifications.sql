-- Device tokens are owned by one authenticated profile. Clients can only read
-- their own registrations; writes go through SECURITY DEFINER RPCs so a token
-- can safely move to a new account after sign-out/sign-in on the same device.
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique check (expo_push_token like 'ExponentPushToken[%]' or expo_push_token like 'ExpoPushToken[%]'),
  platform text not null check (platform in ('android', 'ios')),
  device_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists device_push_tokens_profile_idx
  on public.device_push_tokens(profile_id) where enabled;

alter table public.device_push_tokens enable row level security;
drop policy if exists "users read own push tokens" on public.device_push_tokens;
create policy "users read own push tokens" on public.device_push_tokens
for select to authenticated using (profile_id = (select auth.uid()));

revoke insert, update, delete on public.device_push_tokens from anon, authenticated;
grant select on public.device_push_tokens to authenticated;

create or replace function public.register_push_token(p_token text, p_platform text, p_device_name text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_token not like 'ExponentPushToken[%]' and p_token not like 'ExpoPushToken[%]' then raise exception 'Invalid Expo push token'; end if;
  if p_platform not in ('android', 'ios') then raise exception 'Invalid platform'; end if;

  insert into public.device_push_tokens (profile_id, expo_push_token, platform, device_name, enabled, last_seen_at)
  values (auth.uid(), p_token, p_platform, nullif(trim(coalesce(p_device_name, '')), ''), true, now())
  on conflict (expo_push_token) do update
  set profile_id = excluded.profile_id,
      platform = excluded.platform,
      device_name = excluded.device_name,
      enabled = true,
      last_seen_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  update public.device_push_tokens set enabled = false, last_seen_at = now()
  where profile_id = auth.uid() and expo_push_token = p_token;
$$;

revoke all on function public.register_push_token(text, text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- The Edge Function consumes this private outbox. Keeping delivery work outside
-- the order transaction means a temporary push outage never blocks checkout.
create table if not exists public.notification_outbox (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox(created_at) where status in ('pending', 'failed');
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon, authenticated;

alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
for update to authenticated using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.enqueue_order_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid;
  v_title text;
  v_body text;
  v_route text;
  v_status_label text;
begin
  if tg_op = 'INSERT' then
    select r.owner_id into v_profile_id from public.restaurants r where r.id = new.restaurant_id;
    v_title := 'Yangi buyurtma';
    v_body := '#' || new.order_number || ' buyurtma qabul qilindi. Iltimos, tasdiqlang.';
    v_route := '/restaurant-panel';
  elsif new.status is distinct from old.status then
    v_profile_id := new.customer_id;
    v_status_label := case new.status
      when 'accepted' then 'Restoran buyurtmani qabul qildi'
      when 'preparing' then 'Buyurtma tayyorlanmoqda'
      when 'out_for_delivery' then 'Buyurtma yetkazishga chiqdi'
      when 'delivered' then 'Buyurtma yetkazildi'
      when 'rejected' then 'Buyurtma rad etildi'
      when 'cancelled' then 'Buyurtma bekor qilindi'
      else null
    end;
    if v_status_label is null then return new; end if;
    v_title := 'Buyurtma #' || new.order_number;
    v_body := v_status_label || '.';
    v_route := '/orders';
  else
    return new;
  end if;

  if v_profile_id is null then return new; end if;
  insert into public.notifications (profile_id, title, body, data)
  values (v_profile_id, v_title, v_body, jsonb_build_object('route', v_route, 'orderId', new.id));
  insert into public.notification_outbox (profile_id, title, body, data)
  values (v_profile_id, v_title, v_body, jsonb_build_object('route', v_route, 'orderId', new.id, 'channelId', 'orders'));
  return new;
end;
$$;

drop trigger if exists orders_enqueue_push on public.orders;
create trigger orders_enqueue_push
after insert or update of status on public.orders
for each row execute function public.enqueue_order_push();
