# IndoFleet — Enterprise UAV Fleet & Drone Logistics Platform

IndoFleet is an enterprise-grade drone fleet management, air-corridor dispatch orchestration, and delivery tracking platform engineered for commercial and industrial RPAV (Remotely Piloted Aircraft Vehicle) operations.

---

## Architecture Overview

```
                               ┌────────────────────────────────────────┐
                               │   IndoFleet Operations Control Center   │
                               │  (Vite + React + Tailwind + TypeScript) │
                               └───────────────────┬────────────────────┘
                                                   │ HTTPS / WSS
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │       IndoFleet Core API Engine        │
                               │      (Node.js + Express + TypeScript)   │
                               └───────┬──────────────────────┬─────────┘
                                       │                      │
                  ┌────────────────────┴─────┐         ┌──────┴────────────────────┐
                  │ Dynamic Routing Engine   │         │ Primary Data Persistence  │
                  │ (OSRM & OpenStreetMap)   │         │ (Supabase PostgreSQL +    │
                  └──────────────────────────┘         │  Resilient Local Cache)   │
                                                       └───────────────────────────┘
```

The platform is organized as a modular monorepo:

* **`IndoWings_Frontend/`** — Mission command console, fleet inventory directory, live flight radar, QR airframe audit console, and customer tracking interface.
* **`IndoWings-Backend/`** — High-concurrency RESTful API, dynamic geocoding & OSRM routing engine, two-factor authorization engine, notification hub, and database migrations.
* **`IndoFleet_PilotApp/`** — Companion field operations client for pre-flight safety inspections, live GPS sortie streaming, and proof-of-delivery handovers.

---

## Core Capabilities

### 1. RPAV Fleet & Asset Tracking
* **Enterprise Airframe Directory**: Full lifecycle tracking for large-scale drone inventories with unique hardware IDs, model classifications, airframe status, and maintenance records.
* **Cryptographic QR Labels**: DGCA-compliant high-density QR code generation with unique airframe serial pairing and one-click batch ZIP export.
* **Zero-Defect Condition Audits**: Multi-stage inspection workflows (Hub Acceptance and Customer Handover) with photo/video evidence capture and immutable audit logs.

### 2. Dispatch Orchestration & Security
* **Pre-Dispatch Quality Enforcement**: Orders cannot be dispatched or assigned until all allocated airframes have passed pre-flight safety inspections.
* **Two-Factor Dispatch Authorization**: Role-based OTP verification for admins, dispatchers, and field operators to ensure secure asset handovers.
* **Dynamic Geocoding & Road-Corridor Routing**: Integrated address normalization, coordinate lookup, and real-world distance/duration calculation with caching.

### 3. Mission Telemetry & Emergency Safety
* **Live Flight Radar**: Interactive mission tracking with real-time waypoint progression, battery monitoring, and telemetry streams.
* **SOS Emergency Beacon**: Priority alert system with instant audio, battery, and GPS telemetry broadcast to operations desks.
* **Zero-PII Public Tracking**: Secure customer delivery tracking using hashed tokens to protect customer privacy and sensitive flight data.

---

## System Requirements

* **Node.js**: `v18.x` or later (LTS recommended)
* **Package Manager**: `npm` v9+ or `pnpm`
* **Database**: Supabase (PostgreSQL) or compatible relational database

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/puneetonindowings/Indo-Fleet.git
cd Indo-Fleet
```

### 2. Backend Setup

```bash
cd IndoWings-Backend
npm install
```

Configure your environment variables:

```bash
cp .env.example .env
```

Start the backend service:

```bash
# Development mode with hot-reload
npm run dev

# Production build & start
npm run build
npm start
```

### 3. Frontend Setup

```bash
cd ../IndoWings_Frontend
npm install
```

Configure frontend environment variables:

```bash
cp .env.example .env.local
```

Start the frontend development server:

```bash
# Development server (http://localhost:5173)
npm run dev

# Production build
npm run build
```

---

## Environment Configuration

### Backend (`IndoWings-Backend/.env`)

| Variable | Description | Required |
|---|---|:---:|
| `PORT` | API server listening port (default: `5000`) | No |
| `SUPABASE_URL` | Supabase project endpoint | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Private service-role key for database operations | Yes |
| `JWT_SECRET` | Secret key used for cryptographic token signing | Yes |
| `ADMIN_EMAIL` | Default administrator account email | No |
| `ADMIN_PASSWORD` | Default administrator account password | No |
| `RESEND_API_KEY` | Transactional email delivery service key | No |
| `SMTP_HOST` / `SMTP_PASS` | Nodemailer SMTP fallback transport configuration | No |
| `RAZORPAY_KEY_ID` | Payment gateway API key | No |
| `RAZORPAY_KEY_SECRET` | Payment gateway API secret | No |

### Frontend (`IndoWings_Frontend/.env.local`)

| Variable | Description | Required |
|---|---|:---:|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000` or production URL) | Yes |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID for client-side checkout | No |
| `VITE_MAPTILER_KEY` | MapTiler key for base layer cartography | No |
| `VITE_MAPBOX_ACCESS_TOKEN` | Mapbox token for client-side vector map rendering | No |

---

## Security & Compliance

* **Data Protection**: Public QR scanning endpoints return airframe compliance specifications only; customer PII (phone, address, order values) is strictly masked.
* **Access Control**: Role-based route middleware enforcing granular permissions (`super_admin`, `fleet_manager`, `dispatcher`, `delivery_partner`).
* **Resilient Storage**: In-memory caching with graceful disk fallback ensures mission-critical telemetry survives network interruptions.

---

## License

Copyright © 2026 IndoFleet. All rights reserved.
