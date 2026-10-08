-- Restaurant owners may edit their content, but only administrators may approve it.
-- This keeps the public catalog moderated even when the REST API is called directly.

create or replace function public.enforce_restaurant_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
    return new;
  end if;

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
  if public.is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.approval_status = 'pending';
    new.rejection_reason = null;
    new.reviewed_at = null;
    return new;
  end if;

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

drop trigger if exists restaurants_require_reapproval on public.restaurants;
drop trigger if exists restaurants_enforce_approval on public.restaurants;
create trigger restaurants_enforce_approval
before insert or update on public.restaurants
for each row execute function public.enforce_restaurant_approval();

drop trigger if exists menu_items_require_reapproval on public.menu_items;
drop trigger if exists menu_items_enforce_approval on public.menu_items;
create trigger menu_items_enforce_approval
before insert or update on public.menu_items
for each row execute function public.enforce_menu_approval();

