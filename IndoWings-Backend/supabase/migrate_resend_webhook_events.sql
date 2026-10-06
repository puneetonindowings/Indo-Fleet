-- Run in Supabase SQL Editor before enabling the Resend webhook in production.
-- Webhook payload bodies and message content are never stored in this table.
create table if not exists public.resend_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'processed', 'failed')),
  lease_expires_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text
);

create index if not exists resend_webhook_events_received_at_idx
  on public.resend_webhook_events (received_at);

alter table public.resend_webhook_events enable row level security;
