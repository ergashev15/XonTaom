create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  operator_note text
);

create unique index if not exists account_deletion_one_pending_idx
  on public.account_deletion_requests(profile_id) where status in ('pending', 'processing');
alter table public.account_deletion_requests enable row level security;
drop policy if exists "users read own deletion requests" on public.account_deletion_requests;
create policy "users read own deletion requests" on public.account_deletion_requests
for select to authenticated using (profile_id = (select auth.uid()));
grant select on public.account_deletion_requests to authenticated;
revoke insert, update, delete on public.account_deletion_requests from anon, authenticated;

create or replace function public.request_account_deletion()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_request_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into v_request_id from public.account_deletion_requests
  where profile_id = auth.uid() and status in ('pending', 'processing') limit 1;
  if v_request_id is null then
    insert into public.account_deletion_requests (profile_id)
    values (auth.uid()) returning id into v_request_id;
  end if;
  update public.device_push_tokens set enabled = false where profile_id = auth.uid();
  return v_request_id;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
