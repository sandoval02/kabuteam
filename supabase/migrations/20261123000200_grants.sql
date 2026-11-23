-- This project does not auto-grant new tables to the Data API roles, so grant explicitly.
-- service_role (server code with the secret key): full access; it bypasses RLS by design.
grant usage on schema public to service_role, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- authenticated (browser/user sessions): read only; RLS policies limit rows to their own.
grant select on all tables in schema public to authenticated;
-- db-migrate.mjs creates this table; the Supabase CLI tracks migrations elsewhere, so it may not exist.
do $$ begin
  if to_regclass('public._migrations') is not null then
    execute 'revoke select on public._migrations from authenticated';
  end if;
end $$;

-- anon gets nothing.
revoke all on all tables in schema public from anon;
