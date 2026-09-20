# Resource Footprint

A modern web application helping people measure, understand, and reduce the **water** (Litres) and **energy** (kWh) their everyday habits consume.

---

## Current Status: Phase 5 Complete ✅

- **Phase 1 Complete**: Domain models, calculation engine split into pure modules, versioned factors, test suite.
- **Phase 2 Complete**: Supabase backend, PostgreSQL schema migrations with RLS, pgTAP test suite, typed service repositories (`Result<T, E>`), authentication & account routing.
- **Phase 3 Complete**: Landing page & What-If Simulator hero feature, theme system (light/dark/system), outward-rounded ranges, accessible CSS/SVG comparison bars, shareable URL state & summary.
- **Phase 4 Complete**: Onboarding baseline profile wizard (4-step accessible wizard), personal dashboard with water/energy breakdown & baseline history, guest-to-account simulator handoff flow with 24h expiry.
- **Phase 5 Complete**: Dated deviation logging ("Log a change" at `/log`), multi-baseline deviation-aware numbers on the personal dashboard (`/dashboard`), 30-day timeline chart with accessible table fallback, and a public Methodology & Science page (`/methodology`).

---

## Prerequisites

- **Node.js**: `v20+` or `v22+` (tested on Node 26)
- **Container Engine**: Docker Desktop or [Colima](https://github.com/abiosoft/colima) running (`colima start`)
- **Supabase CLI**: Included via `npx supabase` (v2.117.0+)

---

## Quick Start & Local Setup

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env.local
```
*(Note: `.env.local` is strictly gitignored. Never commit secrets).*

### 2. Start the Local Database

Start the local Supabase containers (PostgreSQL, Auth, PostgREST, Storage, Mailpit):
```bash
npm run db:start
```

To stop containers when done:
```bash
npm run db:stop
```

### 3. Local Email Inbox (Auth Confirmations & Magic Links)

During local development, all outgoing auth confirmation and magic link emails are captured locally by **Mailpit** at:
- **Mailpit Web UI**: [http://127.0.0.1:54324](http://127.0.0.1:54324)
- Email confirmation requirement can be configured in `supabase/config.toml` (`[auth] enable_signup = true`, `email.enable_confirmations = false/true`).

---

## Available NPM Scripts

### Database & Backend
- `npm run db:start` — Starts the local Supabase container stack.
- `npm run db:stop` — Stops all local Supabase containers.
- `npm run db:reset` — Resets local PostgreSQL, re-runs all migrations, and re-seeds from `supabase/seed.sql`.
- `npm run db:test` — Runs pgTAP database tests (`supabase test db`) asserting RLS policies and constraints.
- `npm run db:types` — Generates TypeScript types directly from local PostgreSQL schema into `src/services/database.types.ts`.
- `npm run generate-factor-seed` — Validates `src/data/factors.v1.json` against calculation engine bounds and compiles `supabase/seed.sql`.

### Routes
- `/` — Landing Page with What-If Simulator (works immediately with zero signup, offline-ready).
- `/auth` — Sign in, registration, and magic link authentication.
- `/onboarding` — Protected 4-step wizard to setup or edit baseline profile (Showers, Cooling, Laundry, Review).
- `/dashboard` — Protected personal dashboard with Day/Week/Month resource cards, breakdown charts, and baseline history.
- `/account` — Protected account settings and profile display.
- `*` — Accessible 404 Page Not Found.

### Guest-to-Account Handoff Flow
1. **Try Before Signup**: An anonymous visitor tunes the What-If Simulator on `/`.
2. **Save Baseline Intent**: Clicking "Save this as my baseline" stores `{ version: 1, savedAt, baseline }` in `localStorage` under `rf.pendingBaseline` (valid for 24 hours).
3. **Authentication**: Redirects to `/auth`. Once authenticated (via password or magic link), `postAuthDestination` routes the user to `/onboarding?from=simulator`.
4. **Mandatory Confirmation**: The 4-step onboarding wizard pre-fills the guest's simulator values with a notice (*"We kept the habits you tried in the simulator. Check them and save."*). The user reviews and confirms before any data writes to Postgres.
5. **Clean State**: Upon saving, the pending baseline is purged from `localStorage`.

### How the What-If Simulator Works
1. **Offline & Pre-signup**: Loads conversion benchmarks from bundled `src/data/factors.v1.json` via the pure calculation engine without database calls.
2. **Dual-Panel Architecture**:
   - **Your Typical Day (Baseline)**: Sets the household reference profile (household size, shower time, heater, AC, fan, laptop, laundry loads and machine type). Prefilled from account baseline if signed in.
   - **Try a Change (Scenario)**: Interactive habit sliders and numeric inputs with delta badges (e.g. "-1 h", "+2 min").
3. **Pure Engine Calculations**: All calculations use `@/engine` (`calculateProfile`, `compareProfiles`, `scaleToPeriod`). No formulas are re-implemented in UI components.
4. **Honest Ranges**: Numbers use outward rounding (floored lower bounds, ceiled upper bounds) ensuring ranges never look artificially tighter than empirical data supports.
5. **Shareability**:
   - URL query parameters sync baseline and scenario values automatically via `replaceState`.
   - Single-sentence shareable summary generated by evaluating each altered habit in isolation.

### Frontend & Testing
- `npm run dev` — Starts Vite local dev server.
- `npm run build` — Typechecks and produces production build bundle in `dist/`.
- `npm run typecheck` — Runs strict TypeScript check (`tsc --noEmit`).
- `npm run lint` — Runs ESLint with boundary rules preventing engine imports from UI/services.
- `npm run test` — Runs Vitest test suites (engine, mappers, repositories, protected routes).

---

## Architecture & Security Highlights

- **Row-Level Security (RLS)**: Enforced on 100% of public tables. Anon access is revoked on all user data.
- **Append-Only Baselines**: Historical calculations remain reproducible across life changes.
- **Single Source of Truth**: Conversion factors are authored in versioned JSON (`factors.v1.json`) and compiled into database seed files.
- **Safe Service Layer**: Repositories return typed `Result<T, ServiceError>` objects and pre-validate bounds against `PROFILE_BOUNDS` before initiating database calls.
