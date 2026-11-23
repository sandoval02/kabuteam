-- Caps AI extraction calls per user so one account cannot burn the free Gemini quota.
create table public.extraction_attempts (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('bill', 'appliance')),
  created_at timestamptz not null default now()
);

create index extraction_attempts_profile_created_idx on public.extraction_attempts (profile_id, created_at desc);

alter table public.extraction_attempts enable row level security;

-- Only server code (admin client) may touch this table; users have no direct access.
grant all on public.extraction_attempts to service_role;
grant usage, select on sequence public.extraction_attempts_id_seq to service_role;
