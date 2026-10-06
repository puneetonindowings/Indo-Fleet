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

Configure each app's local environment using its `.env.example`. Keep `.env` and
`.env.local` files private; they are ignored by Git. The frontend requires a
MapTiler key for maps. The backend requires Supabase credentials; see the
backend README and `IndoWings-Backend/supabase/` for setup and database steps.

From the workspace root, `npm run dev` starts both apps after root dependencies
are installed. Alternatively, run `npm run dev` separately in each app folder.
