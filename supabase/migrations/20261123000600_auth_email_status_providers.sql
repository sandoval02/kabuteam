-- Decide by the sign-in methods Supabase records per user (app_metadata.providers), not by the
-- password column: an account with an "email" provider can sign in with a password.
create or replace function public.auth_email_status(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'email' then 'password' else 'google' end
       from auth.users u
      where lower(u.email) = lower(trim(p_email))
      limit 1),
    'none');
$$;

revoke all on function public.auth_email_status(text) from public, anon, authenticated;
grant execute on function public.auth_email_status(text) to service_role;
