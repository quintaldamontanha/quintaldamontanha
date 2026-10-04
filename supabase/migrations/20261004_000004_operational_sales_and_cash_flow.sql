create or replace function public.open_cash_register(p_opening_amount numeric default 0)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.cash_registers where status='open') then raise exception 'There is already an open cash register'; end if;
  insert into public.cash_registers(opened_by, opening_amount) values(auth.uid(), coalesce(p_opening_amount,0)) returning id into v_id;
  if coalesce(p_opening_amount,0) > 0 then insert into public.cash_movements(cash_register_id,type,amount,reason,created_by) values(v_id,'supply',p_opening_amount,'Abertura de caixa',auth.uid()); end if;
  return v_id;
end $$;

create or replace function public.close_cash_register(p_cash_register_id uuid, p_informed_cash numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare v_expected numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select opening_amount + coalesce((select sum(case when type in ('sale','supply') then amount else -amount end) from public.cash_movements where cash_register_id=p_cash_register_id),0) into v_expected from public.cash_registers where id=p_cash_register_id and status='open';
  if v_expected is null then raise exception 'Open cash register not found'; end if;
  update public.cash_registers set closed_by=auth.uid(),closed_at=now(),expected_cash=v_expected,informed_cash=coalesce(p_informed_cash,0),difference=coalesce(p_informed_cash,0)-v_expected,status='closed' where id=p_cash_register_id;
end $$;

create or replace function public.finalize_command_sale(p_command_id uuid,p_payment_method text,p_amount numeric,p_cash_register_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_sale_id uuid;v_subtotal numeric;v_discount numeric;v_service numeric;v_total numeric;v_table uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_payment_method is null or btrim(p_payment_method)='' then raise exception 'Payment method is required'; end if;
  select c.table_id,c.discount,c.service_fee,coalesce(sum(ci.quantity*ci.unit_price) filter(where ci.cancelled_at is null),0) into v_table,v_discount,v_service,v_subtotal from public.commands c left join public.command_items ci on ci.command_id=c.id where c.id=p_command_id and c.status in ('open','payment') group by c.id;
  if not found then raise exception 'Open command not found'; end if;
  v_total:=greatest(v_subtotal-coalesce(v_discount,0)+coalesce(v_service,0),0);
  if abs(coalesce(p_amount,0)-v_total)>0.01 then raise exception 'Payment amount must match sale total'; end if;
  if p_cash_register_id is not null and not exists(select 1 from public.cash_registers where id=p_cash_register_id and status='open') then raise exception 'Cash register is not open'; end if;
  insert into public.sales(command_id,cash_register_id,subtotal,discount,service_fee,total,status,created_by) values(p_command_id,p_cash_register_id,v_subtotal,coalesce(v_discount,0),coalesce(v_service,0),v_total,'completed',auth.uid()) returning id into v_sale_id;
  insert into public.sale_items(sale_id,product_id,quantity,unit_price,unit_cost,total) select v_sale_id,ci.product_id,ci.quantity,ci.unit_price,coalesce(p.cost_price,0),ci.quantity*ci.unit_price from public.command_items ci join public.products p on p.id=ci.product_id where ci.command_id=p_command_id and ci.cancelled_at is null;
  insert into public.sale_payments(sale_id,method,amount) values(v_sale_id,p_payment_method,v_total);
  insert into public.stock_movements(product_id,quantity,type,reason,related_document,created_by) select ci.product_id,-ci.quantity,'sale','Venda de comanda',v_sale_id::text,auth.uid() from public.command_items ci where ci.command_id=p_command_id and ci.cancelled_at is null;
  if p_cash_register_id is not null then insert into public.cash_movements(cash_register_id,type,amount,reason,created_by) values(p_cash_register_id,'sale',v_total,'Venda '||v_sale_id::text,auth.uid()); end if;
  update public.commands set status='finished',closed_at=now() where id=p_command_id;
  if v_table is not null then update public.tables set status='free',updated_at=now() where id=v_table; end if;
  return v_sale_id;
end $$;

grant execute on function public.open_cash_register(numeric) to authenticated;
grant execute on function public.close_cash_register(uuid,numeric) to authenticated;
grant execute on function public.finalize_command_sale(uuid,text,numeric,uuid) to authenticated;