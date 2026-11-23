-- Store payouts: the barangay records that it paid a partner store back for redeemed vouchers,
-- and the store confirms or disputes it. Payouts are an audit trail: written only through the two
-- security-definer functions below, never edited after the store answers, never deleted.

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores on delete restrict,
  amount numeric(10, 2) not null check (amount > 0),
  voucher_count int not null check (voucher_count > 0),
  method text not null check (method in ('cash', 'gcash', 'bank')),
  reference text not null check (char_length(reference) between 3 and 60),  -- GCash ref, bank ref or OR number
  recorded_by uuid not null references public.profiles,
  paid_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'disputed')),
  store_note text check (store_note is null or char_length(store_note) <= 300),
  responded_at timestamptz,
  constraint payouts_dispute_needs_note check (status <> 'disputed' or coalesce(btrim(store_note), '') <> '')
);
create index payouts_store_paid_idx on public.payouts (store_id, paid_at desc);

-- A voucher belongs to at most one payout; one redeemed after a payout goes into the next one.
alter table public.vouchers add column payout_id uuid references public.payouts on delete restrict;
create index vouchers_payout_idx on public.vouchers (payout_id);

-- Monthly voucher budget per barangay (whole pesos). Null = no cap.
alter table public.barangays add column voucher_budget numeric(10, 2) check (voucher_budget is null or voucher_budget >= 0);

-- ── Record a payout (barangay admin of the store's barangay) ─────────
create function public.record_payout(p_store_id uuid, p_method text, p_reference text)
returns table (payout_id uuid, amount numeric, voucher_count int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_ids uuid[];
  v_total numeric;
  v_id uuid;
begin
  perform 1
    from public.stores s
    join public.profiles p on p.id = auth.uid() and p.role = 'admin' and p.barangay_id = s.barangay_id
   where s.id = p_store_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_method is null or p_method not in ('cash', 'gcash', 'bank') then
    raise exception 'bad method' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_reference, ''))) not between 3 and 60 then
    raise exception 'bad reference' using errcode = '22023';
  end if;

  -- Lock the unpaid redeemed vouchers. A concurrent call waits here, then re-checks
  -- payout_id and finds nothing left, so the same vouchers are never paid twice.
  select array_agg(v.id), sum(v.amount) into v_ids, v_total
    from (select id, amount
            from public.vouchers
           where store_id = p_store_id and redeemed_at is not null and payout_id is null
             for update) v;
  if v_ids is null then
    raise exception 'nothing to pay' using errcode = 'P0002';
  end if;

  insert into public.payouts (store_id, amount, voucher_count, method, reference, recorded_by)
  values (p_store_id, v_total, cardinality(v_ids), p_method, btrim(p_reference), auth.uid())
  returning id into v_id;

  update public.vouchers set payout_id = v_id where id = any (v_ids);
  return query select v_id, v_total, cardinality(v_ids);
end $$;

-- ── Confirm or dispute a payout (the store's owner, once) ────────────
create function public.respond_payout(p_payout_id uuid, p_received boolean, p_note text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_received is null then
    raise exception 'bad answer' using errcode = '22023';
  end if;
  if not p_received and v_note is null then
    raise exception 'note required' using errcode = '22023';
  end if;

  update public.payouts po
     set status = case when p_received then 'confirmed' else 'disputed' end,
         store_note = left(v_note, 300),
         responded_at = now()
    from public.stores s
   where po.id = p_payout_id
     and s.id = po.store_id
     and s.owner_profile_id = auth.uid()
     and po.status = 'pending'
  returning po.status into v_status;
  if v_status is null then
    raise exception 'not found or already answered' using errcode = 'P0002';
  end if;
  return v_status;
end $$;

-- ── Access: read via RLS, write only through the functions ───────────
alter table public.payouts enable row level security;

create policy "store owner reads own payouts" on public.payouts for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_profile_id = auth.uid()));

create policy "admin reads barangay payouts" on public.payouts for select to authenticated
  using (exists (
    select 1 from public.stores s
      join public.profiles p on p.id = auth.uid() and p.role = 'admin' and p.barangay_id = s.barangay_id
     where s.id = store_id));

grant all on public.payouts to service_role;
grant select on public.payouts to authenticated;
revoke all on public.payouts from anon;

revoke all on function public.record_payout(uuid, text, text) from public, anon;
grant execute on function public.record_payout(uuid, text, text) to authenticated, service_role;
revoke all on function public.respond_payout(uuid, boolean, text) from public, anon;
grant execute on function public.respond_payout(uuid, boolean, text) to authenticated, service_role;
