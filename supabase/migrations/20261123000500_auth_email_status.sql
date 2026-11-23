-- Lets the sign-in action tell "no account" and "signs in with Google" apart from "wrong password".
-- Returns 'none', 'password' or 'google'. Server-only: anon/authenticated can't call it, so the
-- browser can't use it to probe which emails are registered.
create function public.auth_email_status(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when u.encrypted_password is not null and u.encrypted_password <> '' then 'password' else 'google' end
       from auth.users u
      where lower(u.email) = lower(trim(p_email))
      limit 1),
    'none');
$$;

revoke all on function public.auth_email_status(text) from public, anon, authenticated;
grant execute on function public.auth_email_status(text) to service_role;
