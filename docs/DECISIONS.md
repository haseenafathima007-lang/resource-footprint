# Architectural Decision Records (ADRs)

Key architectural decisions made in Phase 2 for Resource Footprint.

---

## 1. Append-Only Baseline History
- **Context**: Users periodically change appliances, move homes, or adjust daily routines.
- **Decision**: Store baseline habits in an append-only table (`baseline_profiles`) keyed by `(user_id, effective_from)`.
- **Rationale**: If baseline habits were overwritten in-place, historical calculations and past deviation trends would retroactively change, breaking auditability and historical accuracy. The active baseline is resolved dynamically as the latest row where `effective_from <= current_date`.

---

## 2. Text Columns with CHECK Constraints Instead of Postgres Enums
- **Context**: Categories like appliance machine type (`topLoad` vs `frontLoad`), heating types (`none` vs `electric`), and deviation fields are expected to evolve as future phases add more appliances.
- **Decision**: Use `text` columns with explicit `CHECK (column IN (...))` constraints instead of native Postgres enum types.
- **Rationale**: In Postgres, modifying native enums (renaming or dropping values, altering sort order) in zero-downtime environments requires complex migrations and schema lock management. `CHECK` constraints are simpler to migrate, introspect cleanly in TypeScript generation, and can be extended with standard migration scripts.

---

## 3. Factors JSON as Single Source of Truth
- **Context**: Conversion factors must be readable by the client simulator before signup (offline / low latency) and stored in the database for reproducible queries.
- **Decision**: `src/data/factors.v1.json` is the sole authoritative definition of conversion factors, versioning, and sources.
- **Rationale**: Maintaining factor definitions in both SQL migrations and client code inevitably leads to drift. An automated generator (`scripts/generate-factor-seed.ts`) validates the JSON against engine invariant constraints (`low <= typical <= high`) and compiles `supabase/seed.sql`. Published factor versions in the database are strictly immutable.

---

## 4. `Result` Type Instead of Exceptions in Data Layer
- **Context**: UI components consuming asynchronous data services need predictable error states without unexpected crashes or raw Postgres SQL error leaks.
- **Decision**: All repository and auth methods return `Result<T, ServiceError>` objects (`{ ok: true, data } | { ok: false, error }`).
- **Rationale**: Catching exceptions in UI components frequently leads to missed error cases or leaking internal database structure to users. A discriminated union forces callers to handle failure modes explicitly and standardizes error codes (`UNAUTHENTICATED`, `VALIDATION`, `NOT_FOUND`, `NETWORK`, `UNKNOWN`) across all storage adapters.

---

## 5. Bundled Factors for the What-If Simulator
- **Context**: The What-If Simulator is the hero feature of the landing page and must work instantly prior to user registration.
- **Decision**: Load factors from the bundled `src/data/factors.v1.json` via `toFactorsMap` in the pure calculation engine for all anonymous simulator interactions, rather than executing network queries against Supabase.
- **Rationale**: Guarantees zero latency on initial load, complete offline capability, and zero dependency on backend availability or network connectivity for landing page visitors.

---

## 6. Outward-Rounded Ranges
- **Context**: Every habit calculation yields an estimated range (`low` to `high`). Rounding numbers to whole digits using standard midpoint rounding can artificially narrow the interval.
- **Decision**: Apply outward rounding (`floor` for lower bounds, `ceil` for upper bounds) to 2-3 significant figures.
- **Rationale**: Respects the core product principle of "Honest Numbers". Outward rounding ensures that the reported range never looks narrower or more precise than the empirical benchmark bounds support.

---

## 7. URL-Encoded Scenario State via `replaceState`
- **Context**: Users exploring habit changes want to share their scenarios or bookmark specific simulator setups without signing in.
- **Decision**: Serialize baseline habits, scenario adjustments, and period toggles to concise numeric query parameters (e.g., `b_ac=4&s_ac=3`), updating the URL via `window.history.replaceState`.
- **Rationale**: Using `replaceState` prevents history stack pollution (avoiding dozens of slider drag history entries), keeps URLs free of personal data, and provides instant shareability. Parameter inputs are strictly pre-validated against `validateProfile` and engine bounds on parse.
