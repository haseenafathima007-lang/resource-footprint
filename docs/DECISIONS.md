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
