# Indo-Fleet

Indo-Fleet is the workspace for the IndoFleet frontend and backend applications.

## Project structure

- `IndoFleet_Frontend/` — React, TypeScript, and Vite web application.
- `IndoFleet-Backend/` — Express and TypeScript API, Supabase schema, and migrations.

The Delivery Tracking workspace supports searchable order lifecycles, RPAV
details, Porter references, a per-delivery Mapbox route link entered by an
administrator or dispatcher, MapTiler maps, Mapbox driving-route ETA from
saved GPS/pickup coordinates, and OTP-audited dispatch/hold/unhold/reschedule/
delivery/cancellation actions. The saved Mapbox link is for opening the
dispatcher-provided route; the in-app ETA is separately estimated from saved
coordinates and is not live courier telemetry.
Admins can open it from Admin; other authorized delivery operators can use
`/delivery-tracking`.

## Getting started

Install dependencies in each application:

```bash
cd IndoFleet-Backend
npm install
cd ../IndoFleet_Frontend
npm install
```

## Environment configuration

Copy the example files and fill them in locally:

```powershell
Copy-Item IndoFleet-Backend\.env.example IndoFleet-Backend\.env
Copy-Item IndoFleet_Frontend\.env.example IndoFleet_Frontend\.env.local
```

Do not commit real credential values. `.env` and `.env.local` files are
excluded from Git. Keep the Supabase service-role key, JWT secret, payment
secret, email credentials, and SMS provider keys on the backend only.

### Backend: `IndoFleet-Backend/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | API server port (default `5000`). |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Supabase public anon key; backend database access uses the service-role key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required private backend key for database operations; never expose in the frontend. |
| `JWT_SECRET` | Long, unique secret used to sign authentication tokens. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Optional initial administrator account settings. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payment-provider credentials; keep the secret private. |
| `RESEND_API_KEY`, `FROM_EMAIL` | Resend API key and verified sender address used for all application email. |
| `SUPPORT_EMAIL`, `SUPPORT_EMAIL_NAME`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | Support address and sender identity. The configured verified Resend sender is used for account, order, status, and Support Desk notifications; there is no SMTP fallback. |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the Resend webhook; configure in Render, never in the frontend. |
| `SERVICEHUB_SUPABASE_URL`, `SERVICEHUB_SUPABASE_ANON_KEY` | Optional separate Supabase project used by the SMS OTP integration. |
| `FAST2SMS_API_KEY` | Optional Fast2SMS credential. |
| `FRONTEND_URL` | Public frontend origin used in account and booking emails. |

Set the Supabase project values and private service-role key before starting
the backend. See `IndoFleet-Backend/README.md` and
`IndoFleet-Backend/supabase/` for database setup and migrations.

Resend can send support replies only after the configured sender domain is
verified in Resend. Inbound support-email routing is not enabled yet. The
current `indowfleet.com` MX points to Microsoft 365; do not replace it without
planning mail routing, or existing mail delivery may be interrupted.

The Resend webhook receiver is `POST /api/webhooks/resend` (health: `GET` on
the same path). Before enabling it, run
`IndoFleet-Backend/supabase/migrate_resend_webhook_events.sql` in Supabase,
set `RESEND_WEBHOOK_SECRET` and `SUPPORT_EMAIL` in the backend environment, and
subscribe the Resend webhook to `email.received`, `email.sent`,
`email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`,
`email.complained`, and `email.suppressed`. The webhook verifies signatures,
deduplicates event IDs in Supabase, and does not log or persist raw webhook
bodies. Inbound processing requires Resend receiving/domain routing; configure
that only after planning how to preserve existing Microsoft 365 mail delivery.

### Frontend: `IndoFleet_Frontend/.env.local`

| Variable | Purpose |
| --- | --- |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID used by the frontend; do not put the Razorpay secret here. |
| `VITE_MAPTILER_KEY` | MapTiler browser key for delivery maps. Restrict it to your deployed frontend domains. |
| `VITE_MAPBOX_ACCESS_TOKEN` | Restricted public Mapbox token with Directions API access. Used in the browser to estimate road-route ETA from saved coordinates; restrict it to your deployed frontend domains. |

From the workspace root, `npm run dev` starts both apps after root dependencies
are installed. Alternatively, run `npm run dev` separately in each app folder.
