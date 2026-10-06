# Indo-Fleet

Indo-Fleet is the workspace for the IndoWings frontend and backend applications.

## Project structure

- `IndoWings_Frontend/` — React, TypeScript, and Vite web application.
- `IndoWings-Backend/` — Express and TypeScript API, Supabase schema, and migrations.

## Getting started

Install dependencies in each application:

```bash
cd IndoWings-Backend
npm install
cd ../IndoWings_Frontend
npm install
```

## Environment configuration

Copy the example files and fill them in locally:

```powershell
Copy-Item IndoWings-Backend\.env.example IndoWings-Backend\.env
Copy-Item IndoWings_Frontend\.env.example IndoWings_Frontend\.env.local
```

Do not commit real credential values. `.env` and `.env.local` files are
excluded from Git. Keep the Supabase service-role key, JWT secret, payment
secret, email credentials, and SMS provider keys on the backend only.

### Backend: `IndoWings-Backend/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | API server port (default `5000`). |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Supabase public anon key; backend database access uses the service-role key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required private backend key for database operations; never expose in the frontend. |
| `JWT_SECRET` | Long, unique secret used to sign authentication tokens. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Optional initial administrator account settings. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payment-provider credentials; keep the secret private. |
| `RESEND_API_KEY`, `FROM_EMAIL` | Resend email delivery configuration. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional SMTP email configuration (Microsoft 365 commonly uses `smtp.office365.com`, port `587`, with SMTP AUTH/OAuth configured by the tenant). |
| `SERVICEHUB_SUPABASE_URL`, `SERVICEHUB_SUPABASE_ANON_KEY` | Optional separate Supabase project used by the SMS OTP integration. |
| `FAST2SMS_API_KEY` | Optional Fast2SMS credential. |
| `FRONTEND_URL` | Public frontend origin used in account and booking emails. |

Set the Supabase project values and private service-role key before starting
the backend. See `IndoWings-Backend/README.md` and
`IndoWings-Backend/supabase/` for database setup and migrations.

### Frontend: `IndoWings_Frontend/.env.local`

| Variable | Purpose |
| --- | --- |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID used by the frontend; do not put the Razorpay secret here. |
| `VITE_MAPTILER_KEY` | MapTiler browser key for delivery maps. Restrict it to your deployed frontend domains. |

From the workspace root, `npm run dev` starts both apps after root dependencies
are installed. Alternatively, run `npm run dev` separately in each app folder.
