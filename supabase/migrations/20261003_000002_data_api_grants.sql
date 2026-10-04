grant usage on schema public to anon, authenticated;

grant select on public.restaurant_settings, public.categories, public.products, public.events, public.website_settings, public.website_gallery to anon;
grant insert on public.reservations, public.event_reservations to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
