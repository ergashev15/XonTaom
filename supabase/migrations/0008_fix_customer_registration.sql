-- complete_customer_registration declared a variable named full_name. On
-- databases where profiles still has the legacy full_name column the UPDATE was
-- ambiguous and every registration failed. Variables are prefixed to avoid any
-- clash with column names.
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
  v_email text;
  v_phone text;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  v_email := lower(coalesce((select u.email from auth.users u where u.id = auth.uid()), ''));
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_name := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));

  if length(trim(coalesce(p_first_name, ''))) < 2 then raise exception 'Ismingizni kiriting.'; end if;
  if length(trim(coalesce(p_last_name, ''))) < 2 then raise exception 'Familiyangizni kiriting.'; end if;
  if v_email = '' then raise exception 'Tasdiqlangan email kerak.'; end if;
  if v_phone !~ '^\+998[0-9]{9}$' then raise exception 'Telefon raqamini +998 bilan to‘liq kiriting.'; end if;
  if length(trim(coalesce(p_city, ''))) < 2 then raise exception 'Shaharni kiriting.'; end if;
  if length(trim(coalesce(p_address, ''))) < 4 then raise exception 'Manzilni kiriting.'; end if;
  if length(trim(coalesce(p_house, ''))) < 1 then raise exception 'Uy raqamini kiriting.'; end if;

  update public.profiles p
  set first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      name = v_name,
      phone = v_phone,
      email = v_email,
      onboarding_completed = true,
      updated_at = now()
  where p.id = auth.uid();

  delete from public.addresses a
  where a.profile_id = auth.uid() and a.label = 'Asosiy';

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
