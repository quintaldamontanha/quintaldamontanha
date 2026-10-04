create schema if not exists private;

create or replace function private.current_role() returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select r.name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = (select auth.uid())
    and p.active = true
$$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;

create or replace function public.current_role() returns public.app_role
language sql stable security invoker set search_path = ''
as $$ select private.current_role() $$;

revoke all on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;
