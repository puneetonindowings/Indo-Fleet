-- ==============================================================================
-- IndoFleet 700 RPAV Quality & Post-Delivery Inspection Migration Script
-- Safe to re-run (Idempotent: uses IF NOT EXISTS and DROP IF EXISTS)
-- Run this in Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Create dedicated Inspections Table
create table if not exists public.inspections (
  inspection_id text primary key,
  inspection_type text not null default 'DEPOT_MAINTENANCE'
    check (inspection_type in ('DELIVERY_PERSON_CHECK', 'DEPOT_MAINTENANCE')),
  drone_id text not null references public.drone_fleet(id) on delete cascade,
  delivery_id text references public.delivery_orders(id) on delete set null,
  
  -- Delivery Person Zero-Defect Handover Verification fields
  cargo_bay_condition text not null default 'NOT_INSPECTED',
  landing_surface text not null default 'NOT_INSPECTED',
  propeller_debris_check text not null default 'NOT_INSPECTED',
  field_battery_level numeric(5, 2),
  zero_defect_certified boolean not null default false,
  delivery_handover_notes text not null default '',
  
  -- Dispatcher & Fleet Manager Depot Technical Inspection fields
  body_condition text not null default 'GOOD',
  propeller_condition text not null default 'GOOD',
  battery_condition text not null default 'NORMAL',
  landing_gear_condition text not null default 'GOOD',
  depot_avionics_cleared boolean not null default true,
  ready_for_next_sortie boolean not null default true,
  
  -- Overall Status and Metadata
  overall_inspection text not null default 'PASSED'
    check (overall_inspection in ('PASSED', 'FAILED', 'PENDING')),
  remarks text not null default '',
  photo_references jsonb not null default '[]'::jsonb,
  inspected_by text not null default 'system',
  inspector_name text not null default 'Operations Inspector',
  inspector_role text not null default 'dispatcher',
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2. Indexes for high-speed lookup
create index if not exists idx_inspections_drone_id
  on public.inspections (drone_id);

create index if not exists idx_inspections_delivery_id
  on public.inspections (delivery_id);

create index if not exists idx_inspections_type
  on public.inspections (inspection_type);

create index if not exists idx_inspections_date
  on public.inspections (inspected_at desc);

-- 3. Enhance delivery_orders table with inspection reference columns
alter table public.delivery_orders
  add column if not exists inspection_id text,
  add column if not exists inspection_status text default 'PENDING';

-- 4. Enhance drone_fleet table with airframe condition and inspection tracking
alter table public.drone_fleet
  add column if not exists current_condition text not null default 'GOOD',
  add column if not exists last_inspection_id text,
  add column if not exists last_inspection_type text,
  add column if not exists last_inspection_result text,
  add column if not exists last_inspected_at timestamptz;

-- 5. Expand role constraints in audit_logs, delivery_users, and profiles to support pilot and delivery roles
do $$
declare
  c record;
begin
  -- Update public.audit_logs role constraint
  for c in
    select conname from pg_constraint
    where conrelid = 'public.audit_logs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.audit_logs drop constraint %I', c.conname);
  end loop;

  alter table public.audit_logs
    add constraint audit_logs_role_check
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer', 'guest', 'pilot', 'delivery', 'delivery_partner'));

  -- Update public.delivery_users role constraint
  for c in
    select conname from pg_constraint
    where conrelid = 'public.delivery_users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.delivery_users drop constraint %I', c.conname);
  end loop;

  alter table public.delivery_users
    add constraint delivery_users_role_check
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer', 'pilot', 'delivery'));

  -- Update public.profiles role constraint
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'fleet_manager', 'dispatcher', 'support', 'customer', 'pilot', 'delivery'));
end $$;

-- 6. Enable Row Level Security and configure Grants
alter table public.inspections enable row level security;

-- Allow service_role full access
grant all on public.inspections to service_role;

-- Allow authenticated users to view inspection records
drop policy if exists "Allow authenticated read inspections" on public.inspections;
create policy "Allow authenticated read inspections"
  on public.inspections for select
  to authenticated
  using (true);

-- Allow public read for customer drone QR scanning (e.g., https://indo-fleet.vercel.app/drone/RPAV-0001)
drop policy if exists "Allow public read drone inspections" on public.inspections;
create policy "Allow public read drone inspections"
  on public.inspections for select
  to anon
  using (true);
