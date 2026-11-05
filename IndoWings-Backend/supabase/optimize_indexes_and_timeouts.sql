-- ==============================================================================
-- IndoFleet Supabase Optimization & Index Script
-- Fixes: "canceling statement due to statement timeout", speeds up order queries,
-- and ensures unblocked inspection media & zero-defect auditing.
-- Safe to run multiple times (Idempotent).
-- ==============================================================================

-- 1. High-Performance Standalone Index for Order Sorting
-- Eliminates full table sequential scans on GET /api/delivery/orders
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at
  ON public.delivery_orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_type_created
  ON public.delivery_orders (order_type, created_at DESC);

-- 2. Inspections Table Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inspections_delivery_stage
  ON public.inspections (delivery_id, stage, inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_drone_date
  ON public.inspections (drone_id, inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_date_desc
  ON public.inspections (inspected_at DESC);

-- 3. Drone Fleet & User Fast-Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_drone_fleet_status
  ON public.drone_fleet (status);

CREATE INDEX IF NOT EXISTS idx_delivery_users_email
  ON public.delivery_users (email);

CREATE INDEX IF NOT EXISTS idx_delivery_users_role
  ON public.delivery_users (role);

-- 4. Increase Supabase Statement Timeout for Service-Role / Backend
-- Prevents Postgres from canceling long-running or concurrent batch queries prematurely (default is sometimes 8s)
ALTER ROLE service_role SET statement_timeout = '30s';
ALTER ROLE authenticator SET statement_timeout = '20s';

-- 5. Expand Inspections Type Constraint (Allow Hub Pre-Flight & Customer Delivery)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.inspections'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%inspection_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.inspections DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_inspection_type_check
  CHECK (inspection_type IN ('DELIVERY_PERSON_CHECK', 'DEPOT_MAINTENANCE', 'HUB_PRE_FLIGHT_CHECK', 'CUSTOMER_FEEDBACK'));
