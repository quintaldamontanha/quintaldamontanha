-- Bootstrap the initial administrator without storing the email in plaintext.

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role_id uuid;
  v_email_hash text;
begin
  v_email_hash := encode(extensions.digest(lower(new.email), 'sha256'), 'hex');

  if v_email_hash = 'b91b179c0f7f77cecfd324efc952752f5b9be5518feee95a0ae11fb137439286' then
    select id into v_role_id
    from public.roles
    where name = 'administrator'::public.app_role
    limit 1;
  end if;

  insert into public.profiles (id, full_name, role_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role_id
  )
  on conflict (id) do update
    set role_id = coalesce(excluded.role_id, public.profiles.role_id),
        updated_at = now();

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

update public.profiles p
set role_id = r.id,
    updated_at = now()
from public.roles r, auth.users u
where p.id = u.id
  and encode(extensions.digest(lower(u.email), 'sha256'), 'hex') = 'b91b179c0f7f77cecfd324efc952752f5b9be5518feee95a0ae11fb137439286'
  and r.name = 'administrator'::public.app_role;
