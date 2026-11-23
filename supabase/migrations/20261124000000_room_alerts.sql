-- Resolved Room check alerts, for the resident's monthly "nasayang" estimate.
-- Estimates only: no photos, no people data, no observation text.
create table public.room_alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  started_at timestamptz not null,
  resolved_at timestamptz not null,
  kwh numeric not null check (kwh >= 0),
  pesos numeric check (pesos >= 0),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  unique (household_id, started_at)
);

create index room_alerts_household_month_idx on public.room_alerts (household_id, month);

alter table public.room_alerts enable row level security;
revoke all on public.room_alerts from anon, authenticated;
grant all on public.room_alerts to service_role;
