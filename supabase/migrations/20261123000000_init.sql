-- Kuryentipid initial schema.
-- Security model: all writes go through trusted server code using the secret key.
-- RLS below only allows signed-in users to READ their own rows (defense in depth).

create extension if not exists pgcrypto;

-- ── Core ─────────────────────────────────────────────────────────────
create table public.barangays (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create sequence public.household_label_seq;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'resident' check (role in ('resident', 'store', 'admin')),
  barangay_id uuid not null references public.barangays,
  household_label text not null unique,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles on delete cascade,
  account_number text unique,             -- one Meralco account = one household
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  period_start date not null,
  period_end date not null,
  score_month text not null check (score_month ~ '^\d{4}-\d{2}$'),
  kwh numeric(10, 2) not null check (kwh > 0),
  amount_due numeric(12, 2) not null check (amount_due > 0),
  history jsonb not null default '[]',
  photo_path text,
  status text not null check (status in ('approved', 'flagged', 'rejected')),
  flag_reasons text[] not null default '{}',
  extracted jsonb,                         -- original AI values, for the edit-distance check
  served_by text,
  created_at timestamptz not null default now(),
  unique (household_id, score_month)
);

create table public.appliances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  type text not null,
  label text not null,
  watts integer not null check (watts > 0 and watts <= 10000),
  hours_per_day numeric(4, 1) not null check (hours_per_day >= 0 and hours_per_day <= 24),
  is_inverter boolean,
  created_at timestamptz not null default now()
);

create table public.scores (
  bill_id uuid primary key references public.bills on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  barangay_id uuid not null references public.barangays,
  score_month text not null,
  baseline_kwh numeric(10, 2),
  savings_pct numeric(6, 2) not null,
  score numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  unique (household_id, score_month)
);

create table public.badges (
  household_id uuid not null references public.households on delete cascade,
  code text not null check (code in ('first_scan', 'club_10', 'efficient', 'top3')),
  awarded_at timestamptz not null default now(),
  primary key (household_id, code)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays,
  name text not null,
  owner_profile_id uuid not null unique references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  household_id uuid not null references public.households on delete cascade,
  store_id uuid not null references public.stores on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  score_month text not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, score_month)       -- one voucher per household per month
);

create index on public.bills (status);
create index on public.scores (barangay_id, score_month);

-- ── New user → profile + household ───────────────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, barangay_id, household_label)
  values (
    new.id,
    (select id from public.barangays order by created_at limit 1),
    'Bahay #' || lpad(nextval('public.household_label_seq')::text, 3, '0')
  );
  insert into public.households (profile_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Atomic, single-use voucher redemption (called by the store owner) ─
create function public.redeem_voucher(p_code text)
returns table (status text, amount numeric, redeemed_at timestamptz)
language plpgsql security definer set search_path = public as $$
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

revoke all on function public.redeem_voucher(text) from public, anon;
grant execute on function public.redeem_voucher(text) to authenticated;

-- ── Row Level Security: read own rows only; no client writes ─────────
alter table public.barangays  enable row level security;
alter table public.profiles   enable row level security;
alter table public.households enable row level security;
alter table public.bills      enable row level security;
alter table public.appliances enable row level security;
alter table public.scores     enable row level security;
alter table public.badges     enable row level security;
alter table public.stores     enable row level security;
alter table public.vouchers   enable row level security;

create function public.my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.households where profile_id = auth.uid()
$$;

create policy "read barangays" on public.barangays for select to authenticated using (true);
create policy "read stores" on public.stores for select to authenticated using (true);
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "read own household" on public.households for select to authenticated using (profile_id = auth.uid());
create policy "read own bills" on public.bills for select to authenticated using (household_id = public.my_household_id());
create policy "read own appliances" on public.appliances for select to authenticated using (household_id = public.my_household_id());
create policy "read own scores" on public.scores for select to authenticated using (household_id = public.my_household_id());
create policy "read own badges" on public.badges for select to authenticated using (household_id = public.my_household_id());
create policy "read own vouchers" on public.vouchers for select to authenticated using (household_id = public.my_household_id());

-- ── Private bucket for bill photos (server uploads with the secret key) ─
insert into storage.buckets (id, name, public) values ('bill-photos', 'bill-photos', false)
on conflict (id) do nothing;

-- ── Seed: the one barangay this MVP runs in (rename it on the admin page) ─
insert into public.barangays (name) values ('Demo Barangay');
