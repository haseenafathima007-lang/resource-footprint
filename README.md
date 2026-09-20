# Resource Footprint

A modern web application helping people measure, understand, and reduce the **water** (Litres) and **energy** (kWh) their everyday habits consume.

---

## Current Status: Phase 2 Complete ✅

- **Phase 1 Complete**: Domain models, calculation engine with `PROFILE_BOUNDS`, versioned factors, test suite.
- **Phase 2 Complete**: Supabase backend, PostgreSQL schema migrations with RLS, pgTAP test suite, typed service repositories (`Result<T, E>`), authentication & account routing.

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
