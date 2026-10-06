-- IndoFleet Supabase schema
-- Run this in Supabase SQL Editor. Safe to re-run for tables and indexes.
-- All tables have RLS enabled and intentionally have no public/anon policies.
-- Use a server-only SUPABASE_SERVICE_ROLE_KEY for trusted Express access.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'customer'
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer')),
  organization text not null default '',
  badge_id text not null default '',
  phone text,
  saved_addresses jsonb not null default '[]'::jsonb,
  is_email_verified boolean not null default false,
  is_phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing profiles and discard any account role outside the supported set.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_row.conname);
  end loop;

  delete from public.profiles
  where role not in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer');

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer'));
end $$;

create table if not exists public.drone_fleet (
  id text primary key default ('drn-' || gen_random_uuid()::text),
  model_name text not null,
  category text not null default '',
  serial_number text not null unique,
  status text not null default 'ready'
    check (status in ('ready', 'in-flight', 'maintenance', 'standby', 'idle', 'reserved', 'sold', 'assigned', 'en-route', 'charging', 'on-hold')),
  battery_pct numeric(5, 2) not null default 100 check (battery_pct between 0 and 100),
  flight_hours numeric(10, 2) not null default 0,
  max_range_km numeric(10, 2) not null default 0,
  endurance_mins integer not null default 0,
  max_speed_kmh numeric(10, 2) not null default 0,
  payload_capacity_kg numeric(10, 2) not null default 0,
  image_url text not null default '',
  delivery_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drone_fleet
  add column if not exists delivery_data jsonb not null default '{}'::jsonb;

create table if not exists public.missions (
  id text primary key default ('msn-' || gen_random_uuid()::text),
  title text not null,
  operator_email text not null default '',
  drone_model text not null,
  status text not null default 'PLANNED'
    check (status in ('PLANNED', 'ACTIVE', 'COMPLETED', 'ABORTED')),
  location_name text not null default '',
  area_hectares numeric(12, 2) not null default 0,
  altitude_meters numeric(10, 2) not null default 120,
  waypoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key default ('aud-' || gen_random_uuid()::text),
  user_email text not null default '',
  role text not null default '',
  action text not null,
  resource text not null default '',
  ip_address text not null default '',
  severity text not null default 'INFO'
    check (severity in ('INFO', 'WARN', 'CRITICAL')),
  "timestamp" timestamptz not null default now()
);

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.audit_logs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.audit_logs drop constraint %I', constraint_row.conname);
  end loop;

  delete from public.audit_logs
  where role is null
     or role not in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer', 'guest');

  alter table public.audit_logs
    add constraint audit_logs_role_check
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer', 'guest'));
end $$;

create table if not exists public.demo_requests (
  id text primary key default ('lead-' || gen_random_uuid()::text),
  name text not null,
  email text not null,
  phone text,
  organization text,
  drone_interest text not null,
  use_case text,
  message text,
  created_at timestamptz not null default now()
);

-- Delivery/operations accounts are separate from the legacy GCS profiles.
-- Do not store temporary or plain-text passwords here.
create table if not exists public.delivery_users (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text,
  role text not null
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer')),
  station text,
  organization text,
  status text not null default 'active'
    check (status in ('active', 'disabled', 'pending')),
  password_hash text,
  must_change_password boolean not null default true,
  saved_addresses jsonb not null default '[]'::jsonb,
  is_email_verified boolean not null default false,
  is_phone_verified boolean not null default false,
  profile_data jsonb not null default '{}'::jsonb,
  authorized_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_users
  add column if not exists saved_addresses jsonb not null default '[]'::jsonb,
  add column if not exists is_email_verified boolean not null default false,
  add column if not exists is_phone_verified boolean not null default false,
  add column if not exists profile_data jsonb not null default '{}'::jsonb;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.delivery_users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.delivery_users drop constraint %I', constraint_row.conname);
  end loop;

  delete from public.delivery_users
  where role is null
     or role not in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer');

  alter table public.delivery_users
    alter column role set not null;

  alter table public.delivery_users
    add constraint delivery_users_role_check
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer'));
end $$;

create table if not exists public.customer_addresses (
  id text primary key default ('addr-' || gen_random_uuid()::text),
  customer_id text not null references public.delivery_users(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  recipient_phone text not null,
  full_address text not null,
  landmark text,
  city text not null,
  pincode text not null,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_orders (
  id text primary key,
  order_type text not null default 'delivery',
  challan_number text,
  creator_id text,
  customer_name text not null default '',
  client_name text,
  customer_email text not null default '',
  customer_phone text not null default '',
  recipient_name text,
  recipient_phone text,
  is_for_someone_else boolean not null default false,
  delivery_notes text not null default '',
  pickup_address text not null default '',
  drop_address text not null default '',
  destination_address text,
  address_id text,
  package_type text not null default '',
  drones_shipped text,
  drone_model text,
  units_count integer not null default 1 check (units_count > 0),
  carrier text,
  weight_kg numeric(12, 2) not null default 0,
  fare_inr numeric(14, 2),
  payment_id text,
  payment_status text not null default 'not_applicable',
  payment_method text not null default 'none',
  aerial_distance_km numeric(12, 2),
  flight_duration_mins integer,
  status text not null default 'pending',
  drone_id text,
  scheduled_time timestamptz,
  estimated_delivery timestamptz,
  items jsonb not null default '[]'::jsonb,
  reserved_inventory_ids text[] not null default '{}',
  timeline jsonb not null default '[]'::jsonb,
  handover_details jsonb,
  feedback_submitted boolean not null default false,
  cancelled_at timestamptz,
  cancellation_reason text,
  delivered_at timestamptz,
  delivery_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_orders
  add column if not exists delivery_data jsonb not null default '{}'::jsonb;

create table if not exists public.delivery_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.delivery_orders(id) on delete cascade,
  product_model text not null,
  quantity integer not null check (quantity > 0),
  unit_price_inr numeric(14, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id text primary key,
  customer_id text references public.delivery_users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  order_id text references public.delivery_orders(id) on delete set null,
  category text not null default '',
  priority text not null default 'normal',
  preferred_time text,
  message text not null default '',
  status text not null default 'pending',
  resolution_notes text,
  call_logs jsonb not null default '[]'::jsonb,
  request_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_requests
  add column if not exists request_data jsonb not null default '{}'::jsonb;

create table if not exists public.feedbacks (
  id text primary key,
  customer_id text references public.delivery_users(id) on delete set null,
  user_name text not null default 'Anonymous',
  user_email text not null default '',
  drone_name text not null default '',
  order_id text references public.delivery_orders(id) on delete set null,
  rating integer not null default 5 check (rating between 1 and 5),
  category text not null default 'General',
  message text not null,
  verified_order boolean not null default false,
  status text not null default 'published',
  feedback_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedbacks
  add column if not exists feedback_data jsonb not null default '{}'::jsonb;

-- OTP codes are stored only as hashes and consumed once.
create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.delivery_users(id) on delete cascade,
  destination_hash text not null,
  otp_hash text not null,
  purpose text not null,
  challenge_data jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.otp_challenges
  add column if not exists challenge_data jsonb not null default '{}'::jsonb;

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

create index if not exists idx_drone_fleet_model_status
  on public.drone_fleet (model_name, status);
create index if not exists idx_missions_status_created
  on public.missions (status, created_at desc);
create index if not exists idx_audit_logs_timestamp
  on public.audit_logs ("timestamp" desc);
create index if not exists idx_demo_requests_email_created
  on public.demo_requests (email, created_at desc);
create index if not exists idx_customer_addresses_customer
  on public.customer_addresses (customer_id);
create index if not exists idx_delivery_users_phone
  on public.delivery_users (phone);
create index if not exists idx_delivery_orders_customer_created
  on public.delivery_orders (creator_id, created_at desc);
create index if not exists idx_delivery_orders_status_created
  on public.delivery_orders (status, created_at desc);
create index if not exists idx_delivery_order_items_order
  on public.delivery_order_items (order_id);
create index if not exists idx_support_requests_status_created
  on public.support_requests (status, created_at desc);
create index if not exists idx_feedbacks_created
  on public.feedbacks (created_at desc);
create index if not exists idx_otp_challenges_expiry
  on public.otp_challenges (expires_at)
  where consumed_at is null;
create unique index if not exists idx_otp_challenges_destination_purpose_active
  on public.otp_challenges (destination_hash, purpose)
  where consumed_at is null;
create index if not exists idx_dispatch_history_date
  on public.dispatch_history (dispatched_at desc);
create index if not exists idx_dispatch_history_client
  on public.dispatch_history (client_id, dispatched_at desc);

alter table public.profiles enable row level security;
alter table public.drone_fleet enable row level security;
alter table public.missions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.demo_requests enable row level security;
alter table public.delivery_users enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.delivery_order_items enable row level security;
alter table public.support_requests enable row level security;
alter table public.feedbacks enable row level security;
alter table public.otp_challenges enable row level security;
alter table public.dispatch_history enable row level security;

-- Atomic customer booking reservation. This prevents two concurrent requests
-- from reserving the same idle, QC-passed inventory units.
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
    select * into drone_row
    from public.drone_fleet
    where id = requested_id
    for update;

    if not found
       or drone_row.status <> 'reserved'
       or drone_row.delivery_data->>'assigned_order' <> current_order.id
       or drone_row.delivery_data->>'dispatch_status' = 'dispatched'
       or exists (
         select 1 from public.dispatch_history
         where order_id = current_order.id and drone_id = requested_id
       ) then
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
      dispatcher_id, dispatcher_name, dispatcher_role, status,
      otp_verified, dispatched_at
    ) values (
      dispatch_id_value, current_order.id, current_order.creator_id, current_order.customer_name,
      drone_row.id, drone_row.model_name, p_dispatcher->>'id',
      p_dispatcher->>'name', p_dispatcher->>'role', 'dispatched',
      true, dispatch_time
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

-- No anon/authenticated policies are intentionally added here:
-- customer PII, OTPs, audit logs, and operational orders must only be accessed
-- through the trusted backend. Add narrowly-scoped policies only if the app is
-- later changed to use Supabase Auth directly in the browser.
