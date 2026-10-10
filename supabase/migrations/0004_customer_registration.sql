alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Accounts that existed before this onboarding flow remain usable.
update public.profiles
set onboarding_completed = true
where onboarding_completed = false;

alter table public.addresses enable row level security;

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "users read own addresses" on public.addresses;
create policy "users read own addresses" on public.addresses
for select using (profile_id = auth.uid());

drop policy if exists "users create own addresses" on public.addresses;
create policy "users create own addresses" on public.addresses
for insert with check (profile_id = auth.uid());

drop policy if exists "users update own addresses" on public.addresses;
create policy "users update own addresses" on public.addresses
for update using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "users delete own addresses" on public.addresses;
create policy "users delete own addresses" on public.addresses
for delete using (profile_id = auth.uid());

create or replace function public.complete_customer_registration(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_house text,
  p_landmark text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_email text;
  normalized_phone text;
  full_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  current_user_email := lower(coalesce((select email from auth.users where id = auth.uid()), ''));
  normalized_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  full_name := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));

  if length(trim(coalesce(p_first_name, ''))) < 2 then raise exception 'First name is required'; end if;
  if length(trim(coalesce(p_last_name, ''))) < 2 then raise exception 'Last name is required'; end if;
  if current_user_email = '' then raise exception 'Verified Google email is required'; end if;
  if normalized_phone !~ '^\+998[0-9]{9}$' then raise exception 'Valid Uzbekistan phone is required'; end if;
  if length(trim(coalesce(p_city, ''))) < 2 then raise exception 'City is required'; end if;
  if length(trim(coalesce(p_address, ''))) < 4 then raise exception 'Address is required'; end if;
  if length(trim(coalesce(p_house, ''))) < 1 then raise exception 'House is required'; end if;

  update public.profiles
  set first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      name = full_name,
      phone = normalized_phone,
      email = current_user_email,
      onboarding_completed = true,
      updated_at = now()
  where id = auth.uid();

  delete from public.addresses
  where profile_id = auth.uid() and label = 'Asosiy';

  insert into public.addresses (profile_id, label, address, house, landmark)
  values (
    auth.uid(),
    'Asosiy',
    trim(p_city) || ', ' || trim(p_address),
    trim(p_house),
    nullif(trim(coalesce(p_landmark, '')), '')
  );
end;
$$;

revoke all on function public.complete_customer_registration(text, text, text, text, text, text, text) from public;
grant execute on function public.complete_customer_registration(text, text, text, text, text, text, text) to authenticated;
