-- OUT columns (amount, redeemed_at) share names with vouchers columns; prefer the table column.
create or replace function public.redeem_voucher(p_code text)
returns table (status text, amount numeric, redeemed_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v public.vouchers;
  s public.stores;
begin
  select * into s from public.stores where owner_profile_id = auth.uid();
  if not found then
    return query select 'not_store'::text, null::numeric, null::timestamptz; return;
  end if;

  update public.vouchers
     set redeemed_at = now()
   where code = upper(trim(p_code)) and store_id = s.id
     and redeemed_at is null and expires_at > now()
  returning * into v;
  if found then
    return query select 'ok'::text, v.amount, v.redeemed_at; return;
  end if;

  select * into v from public.vouchers where code = upper(trim(p_code));
  if not found then
    return query select 'not_found'::text, null::numeric, null::timestamptz;
  elsif v.store_id <> s.id then
    return query select 'wrong_store'::text, v.amount, null::timestamptz;
  elsif v.redeemed_at is not null then
    return query select 'used'::text, v.amount, v.redeemed_at;
  else
    return query select 'expired'::text, v.amount, null::timestamptz;
  end if;
end $$;
