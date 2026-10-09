# IndoFleet Aerial Logistics - Backend Engine

Autonomous drone dispatch, live flight telemetry simulation, and fleet management API engine built with Node.js, Express, and TypeScript for the IndoFleet Autonomous Drone Delivery Network (DGCA Green Corridor compliant).

## Environment Variables (.env)

Copy `.env.example` to `.env` and fill in credentials locally. Keep `.env` private and never commit it. The provided Supabase anon key is public; the Express server should use `SUPABASE_SERVICE_ROLE_KEY` for trusted database access once configured in Supabase. Never place the service-role key in frontend variables.

See `supabase/schema.sql` for the project database schema.

The backend requires `SUPABASE_URL` and the private `SUPABASE_SERVICE_ROLE_KEY`.
Keep the service-role key only in this backend `.env`; it bypasses RLS. The API
verifies the database schema before it starts listening.

## Features
- **Fleet Management**: Live telemetry, battery health, payload capacities, status monitoring.
- **Flight Corridors & Order Dispatch**: Automated drone routing, ETA calculation, and dynamic flight phase updates.
- **Customer Storefront**: Admin-provisioned customer accounts can browse QC-cleared stock, place no-payment bookings, save delivery addresses, and track order status.
- **Dual OTP Verification**: SMS OTP via Supabase and Email OTP via Resend.
- **AI Copilot & Tracking Bot**: Integrated intelligent chatbot endpoints for order lookup, name verification, and live telemetry HUD.
- **Admin & Analytics**: Order overview, flight statistics, feedback, and customer support desks.
- **Admin Account Controls**: OTP-protected provisioning, active/restricted account controls, account details, and deletion safeguards.
- **Admin Drone Inventory**: OTP-protected add/edit and bulk import from CSV, XLSX, DOCX, manually entered rows, or text-based comma-delimited PDFs (scanned PDFs are not OCR-processed).
- **OTP-Audited Drone Dispatch**: Admins and dispatchers can select client bookings, dispatch only their reserved drone IDs after OTP verification, and review an append-only dispatch history.

### Customer booking API

The storefront reads available model stock from idle, QC-passed inventory. A customer booking reserves the requested units, creates an `IW-YYYYMMDD-XXXXXX` order ID, and sends a confirmation email; no payment is taken. Customers can only read their own storefront order history and cancel while a booking is still pending. Dispatcher status updates are reflected in the customer's order history and notification emails. Set `FRONTEND_URL` to the public frontend origin so provisioning and booking emails link to the deployed app.

- `GET /api/delivery/store/products`
- `GET /api/delivery/store/orders` (customer token required)
- `POST /api/delivery/store/orders` (customer token required)
- `POST /api/delivery/store/orders/:id/cancel` (owner, pending bookings only)

### Apply the database schema and migrate local data

1. Since the base schema was already run, run `supabase/migrate_delivery_persistence.sql` in Supabase SQL Editor. It safely adds the columns and atomic booking, cancellation, and OTP-audited drone-dispatch functions required by the backend. For a brand-new project, run `supabase/schema.sql` instead.
2. Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in this backend's private `.env`.
3. From this backend directory, run `npm run migrate:json` once. It imports records from `data/users.json`, `drones.json`, `orders.json`, `expert_requests.json`, and `feedbacks.json` only when their IDs are absent remotely; existing remote records are left unchanged. Imported passwords are hashed. JSON files remain untouched as backups, and short-lived OTPs are not migrated.
4. Start the API. It checks Supabase connectivity and schema before listening. Delivery accounts, inventory, orders, OTP challenges, support requests, and feedback use Supabase; failures are no longer silently redirected to local JSON.

If the service-role key has been exposed, rotate it in Supabase before production use and update the backend `.env`.

## Tech Stack
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **Database**: Supabase Postgres through the trusted Express backend
- **Authentication**: JWT & OTP verification
- **Notifications**: Resend API for application email; Supabase SMS gateway for phone OTP

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```
