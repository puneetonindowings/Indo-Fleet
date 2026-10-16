
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  authorized_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A one-way, hashed OTP store for future migration from the current local JSON store.
create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.delivery_users(id) on delete cascade,
  destination_hash text not null,
  otp_hash text not null,
  purpose text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
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

