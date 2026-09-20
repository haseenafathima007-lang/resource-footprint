# Resource Footprint - Project Context

"Resource Footprint" is an accessible, mobile-first web app that empowers individuals and households to measure, understand, and reduce their everyday water (Litres) and energy (Kilowatt-hours) consumption.

## Product Principles

1. **Try Before Signup**: The What-If Simulator is front-and-centre on the landing page, working immediately without an account using sensible defaults.
2. **No Daily Logging Fatigue**: Users describe a typical day/week once (the baseline profile). Moving forward, they only log exceptions and deviations (e.g. "heatwave: AC +3 hrs").
3. **Honest Numbers**: Every calculation produces an **estimated range** (`low`, `typical`, `high`), never false precision. Every conversion factor cites its empirical source.
4. **Same Engine Everywhere**: The dashboard, simulator, opportunities, and goals all rely on the exact same pure calculation function.

## Architecture Layers & Boundaries

- `/src/engine`: Pure, side-effect-free TypeScript calculation engine. No UI or network imports.
- `/src/data`: Versioned conversion factors (`factors.v1.json`). Single source of truth.
- `/src/services`: Data access and external communication layer (Supabase, Auth, Storage).
- `/src/hooks`: React hooks wrapping services with reactivity.
- `/src/components`: Accessible, responsive UI components.
- `/src/pages`: Page-level components.

## Project Phases

- **Phase 1 (Complete)**: Core calculation engine, versioned factors, domain types, unit test suite.
- **Phase 2 (Current)**: Supabase backend, schema migrations, Row-Level Security (RLS), typed repository service layer, authentication with protected routes.
- **Phases 3 - 9 (Upcoming)**: Landing page & What-If Simulator, Onboarding wizard, Dashboard visualizations, Deviation logging UI, Goals, Teams, Polish & Performance.
