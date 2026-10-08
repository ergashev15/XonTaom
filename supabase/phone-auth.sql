-- XonTaom telefon autentifikatsiyasi uchun Supabase SQL Editor'da bir marta ishga tushiring.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  full_name text,
  restaurant_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, coalesce(new.phone, ''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- MUHIM: rollarni faqat Supabase SQL Editor yoki ishonchli backend orqali bering.
-- Administrator:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where phone = '+998901234567';

-- Restoran xodimi:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) ||
--   '{"role":"restaurant","restaurant_id":"xonobod-osh"}'::jsonb
-- where phone = '+998901234567';

-- Oddiy mijoz uchun role kiritish shart emas; ilova uni customer deb qabul qiladi.
