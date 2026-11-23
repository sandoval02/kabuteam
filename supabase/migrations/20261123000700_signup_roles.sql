-- Sign-up picks a role. Stores that sign themselves up wait for the barangay admin's approval
-- (approved_at is null until then); stores that already exist count as approved.
alter table public.stores add column approved_at timestamptz;
update public.stores set approved_at = created_at;

-- Data Privacy Act (RA 10173): when the person agreed to how their bill data is used.
alter table public.profiles add column consented_at timestamptz;

-- Google sign-in now creates the account server-side with app_metadata.signup = "google" (no password
-- the person knows). Such accounts report "google"; email accounts report "password".
create or replace function public.auth_email_status(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case
              when u.raw_app_meta_data ->> 'signup' = 'google' then 'google'
              when coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'email' then 'password'
              else 'google'
            end
       from auth.users u
      where lower(u.email) = lower(trim(p_email))
      limit 1),
    'none');
$$;

revoke all on function public.auth_email_status(text) from public, anon, authenticated;
grant execute on function public.auth_email_status(text) to service_role;
