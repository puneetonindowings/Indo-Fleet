-- Apply after the base supabase/schema.sql has already been run.
-- Safe to re-run. The backend requires the service-role key; do not add anon policies.

alter table public.drone_fleet
  add column if not exists delivery_data jsonb not null default '{}'::jsonb;

alter table public.delivery_users
  add column if not exists saved_addresses jsonb not null default '[]'::jsonb,
  add column if not exists is_email_verified boolean not null default false,
  add column if not exists is_phone_verified boolean not null default false,
  add column if not exists profile_data jsonb not null default '{}'::jsonb;

alter table public.delivery_orders
  add column if not exists delivery_data jsonb not null default '{}'::jsonb;

alter table public.support_requests
  add column if not exists request_data jsonb not null default '{}'::jsonb;

alter table public.feedbacks
  add column if not exists feedback_data jsonb not null default '{}'::jsonb;

alter table public.otp_challenges
  add column if not exists challenge_data jsonb not null default '{}'::jsonb;

create index if not exists idx_delivery_users_phone
  on public.delivery_users (phone);

create unique index if not exists idx_otp_challenges_destination_purpose_active
  on public.otp_challenges (destination_hash, purpose)
  where consumed_at is null;

create table if not exists public.dispatch_history (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.delivery_orders(id),
  client_id text not null,
  client_name text not null,
  drone_id text not null references public.drone_fleet(id),
  drone_model text not null,
  dispatcher_id text not null,
  dispatcher_name text not null,
  dispatcher_role text not null check (dispatcher_role in ('admin', 'dispatcher')),
  status text not null default 'dispatched' check (status = 'dispatched'),
  otp_verified boolean not null default true check (otp_verified),
  dispatched_at timestamptz not null default now(),
  activity_data jsonb not null default '{}'::jsonb,
  unique (order_id, drone_id)
);

alter table public.dispatch_history enable row level security;
create index if not exists idx_dispatch_history_date
  on public.dispatch_history (dispatched_at desc);
create index if not exists idx_dispatch_history_client
  on public.dispatch_history (client_id, dispatched_at desc);

create or replace function public.create_delivery_booking(
  p_order jsonb,
  p_drone_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer;
  reserved_count integer;
  new_order public.delivery_orders;
begin
  requested_count := coalesce(array_length(p_drone_ids, 1), 0);
  if requested_count = 0 then
    raise exception 'At least one drone must be reserved';
  end if;

  update public.drone_fleet
  set status = 'reserved',
      delivery_data = delivery_data || jsonb_build_object(
        'assigned_order', p_order->>'id',
        'assigned_client', p_order->>'customer_name'
      ),
      updated_at = now()
  where id = any(p_drone_ids)
    and status = 'idle'
    and delivery_data->>'qc_status' = 'passed';

  get diagnostics reserved_count = row_count;
  if reserved_count <> requested_count then
    raise exception 'Requested inventory is no longer available';
  end if;

  insert into public.delivery_orders
  select (jsonb_populate_record(null::public.delivery_orders, p_order)).*
  returning * into new_order;

  return to_jsonb(new_order);
end;
$$;

revoke all on function public.create_delivery_booking(jsonb, text[]) from public, anon, authenticated;
grant execute on function public.create_delivery_booking(jsonb, text[]) to service_role;

create or replace function public.cancel_delivery_booking(
  p_order_id text,
  p_customer_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.delivery_orders;
  updated_order public.delivery_orders;
  released_count integer;
begin
  select * into current_order
  from public.delivery_orders
  where id = p_order_id
  for update;

  if not found
     or current_order.creator_id <> p_customer_id
     or current_order.order_type <> 'drone_purchase'
     or current_order.status <> 'pending' then
    raise exception 'Booking is not eligible for customer cancellation';
  end if;

  update public.drone_fleet
  set status = 'idle',
      delivery_data = delivery_data - 'assigned_order' - 'assigned_client',
      updated_at = now()
  where id = any(current_order.reserved_inventory_ids)
    and delivery_data->>'assigned_order' = current_order.id;
  get diagnostics released_count = row_count;
  if released_count <> coalesce(array_length(current_order.reserved_inventory_ids, 1), 0) then
    raise exception 'Reserved inventory could not be released safely';
  end if;

  update public.delivery_orders
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = coalesce(nullif(p_reason, ''), 'Cancelled by customer'),
      updated_at = now()
  where id = current_order.id
  returning * into updated_order;

  return to_jsonb(updated_order);
end;
$$;

revoke all on function public.cancel_delivery_booking(text, text, text) from public, anon, authenticated;
grant execute on function public.cancel_delivery_booking(text, text, text) to service_role;

create or replace function public.dispatch_booked_drones(
  p_order_id text,
  p_drone_ids text[],
  p_dispatcher jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.delivery_orders;
  drone_row public.drone_fleet;
  history_row public.dispatch_history;
  requested_count integer;
  updated_count integer;
  updated_timeline jsonb;
  dispatch_time timestamptz := now();
  result jsonb := '[]'::jsonb;
  requested_id text;
  dispatch_id_value text;
begin
  requested_count := coalesce(array_length(p_drone_ids, 1), 0);
  if requested_count = 0
     or (select count(distinct drone_id) from unnest(p_drone_ids) as ids(drone_id)) <> requested_count then
    raise exception 'Select one or more unique booked drone IDs';
  end if;
  if coalesce(p_dispatcher->>'id', '') = ''
     or coalesce(p_dispatcher->>'name', '') = ''
     or p_dispatcher->>'role' not in ('admin', 'dispatcher') then
    raise exception 'An authorized dispatcher identity is required';
  end if;

  select * into current_order
  from public.delivery_orders
  where id = p_order_id
  for update;

  if not found
     or current_order.order_type <> 'drone_purchase'
     or current_order.status not in ('pending', 'assigned', 'in-flight') then
    raise exception 'Booking is not eligible for dispatch';
  end if;
  if not (p_drone_ids <@ current_order.reserved_inventory_ids) then
    raise exception 'A selected drone is not reserved for this customer booking';
  end if;

  for requested_id in select unnest(p_drone_ids)
  loop
    select * into drone_row from public.drone_fleet where id = requested_id for update;
    if not found
       or drone_row.status <> 'reserved'
       or drone_row.delivery_data->>'assigned_order' <> current_order.id
       or drone_row.delivery_data->>'dispatch_status' = 'dispatched'
       or exists (select 1 from public.dispatch_history where order_id = current_order.id and drone_id = requested_id) then
      raise exception 'A selected drone is unavailable, unrelated, or already dispatched';
    end if;

    dispatch_id_value := gen_random_uuid()::text;
    update public.drone_fleet
    set status = 'en-route',
        delivery_data = delivery_data || jsonb_build_object(
          'dispatch_status', 'dispatched',
          'dispatch_id', dispatch_id_value,
          'dispatcher_id', p_dispatcher->>'id',
          'dispatcher_name', p_dispatcher->>'name',
          'dispatched_at', dispatch_time
        ),
        updated_at = dispatch_time
    where id = requested_id
      and status = 'reserved'
      and delivery_data->>'assigned_order' = current_order.id;
    get diagnostics updated_count = row_count;
    if updated_count <> 1 then
      raise exception 'A selected drone changed state during dispatch';
    end if;

    insert into public.dispatch_history (
      id, order_id, client_id, client_name, drone_id, drone_model,
      dispatcher_id, dispatcher_name, dispatcher_role, status, otp_verified, dispatched_at
    ) values (
      dispatch_id_value, current_order.id, current_order.creator_id, current_order.customer_name,
      drone_row.id, drone_row.model_name, p_dispatcher->>'id',
      p_dispatcher->>'name', p_dispatcher->>'role', 'dispatched', true, dispatch_time
    ) returning * into history_row;
    result := result || jsonb_build_array(to_jsonb(history_row));
  end loop;

  select coalesce(
    jsonb_agg(
      case when element->>'step' = 'Dispatched to your address'
        then jsonb_set(jsonb_set(element, '{done}', 'true'::jsonb), '{time}', to_jsonb(dispatch_time::text))
        else element
      end order by ordinal
    ),
    '[]'::jsonb
  ) into updated_timeline
  from jsonb_array_elements(coalesce(current_order.timeline, '[]'::jsonb)) with ordinality as timeline(element, ordinal);

  update public.delivery_orders
  set status = case when status = 'pending' then 'assigned' else status end,
      timeline = updated_timeline,
      updated_at = dispatch_time
  where id = current_order.id;
  return result;
end;
$$;

revoke all on function public.dispatch_booked_drones(text, text[], jsonb) from public, anon, authenticated;
grant execute on function public.dispatch_booked_drones(text, text[], jsonb) to service_role;
