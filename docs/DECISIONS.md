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

---

## 8. LocalStorage Guest Handoff with Expiry and Confirmation
- **Context**: Visitors fine-tune habit parameters on the public What-If Simulator and want to save that exact profile upon registering an account.
- **Decision**: Persist guest inputs into `localStorage` (`rf.pendingBaseline`) formatted as `{ version: 1, savedAt: timestamp, baseline: BaselineProfile }` with a 24-hour expiration window.
- **Rationale**: A magic-link authentication flow may open in an external email client or new browser tab, making `sessionStorage` unreliable. The data structure holds strictly numeric habit inputs (no PII), validates safely against `validateProfile` discarding corrupted or expired payloads, and requires manual review and confirmation in the onboarding wizard prior to database persistence. The pending payload is permanently evicted upon saving or sign-out.

---

## 9. Per-Baseline Factor Versions for Historical Reproducibility
- **Context**: Baseline habit profiles recorded months or years in the past must remain accurately reproducible even when national grid or water utility factors are updated in new factor sets.
- **Decision**: Every baseline profile row references a foreign key `factors_version`. When calculating dashboard history, each snapshot resolves factors specifically for its recorded version.
- **Rationale**: If historical calculations were always recomputed with the latest factor set, past data would subtly shift over time. If a factor set cannot be resolved, the entry is explicitly rendered as "unavailable" rather than silently computing with inaccurate conversion factors.

---

## 10. No Fabricated Historical Points
- **Context**: The personal dashboard features a baseline history timeline. New users start with a single baseline profile.
- **Decision**: If a user has fewer than two recorded baseline snapshots, display an explicit informative empty state (*"Your history will build up as you update your baseline"*) rather than interpolating, synthesizing hypothetical earlier points, or drawing artificial flat lines.
- **Rationale**: Adheres to the core principle of "Honest Numbers". Fabricating trend points or interpolating dates misleads users into interpreting synthetic benchmarks as personal history.

---

## 11. Route-Level Code Splitting for Recharts
- **Context**: `recharts` is required for rich, accessible water/energy breakdown charts and historical area charts on `/dashboard`, but adds significant bundle weight (~114 kB gzip) to client payloads.
- **Decision**: Code-split `/dashboard` via `React.lazy()` and dynamic `import("./pages/DashboardPage.tsx")` wrapped in `Suspense`.
- **Rationale**: Anonymous visitors exploring the landing page and What-If Simulator load only the lightweight core bundle (~172 kB gzip), completely excluding Recharts and Lucide chart assets until authenticated navigation to `/dashboard`.

---

## 12. Grouped Deviations with UUID `group_id` and Undo Action
- **Context**: Users frequently log multi-habit temporary events (e.g. a "Summer heatwave" that increases AC by +3h and fans by +2h for 5 days).
- **Decision**: Persist multi-field deviation entries with a shared `group_id` (UUID). Deletions and single-click "Undo" operations target the entire `group_id` atomically.
- **Rationale**: Storing discrete field rows preserves clean relational indexing and bounds checks while `group_id` grouping ensures the user experiences coherent multi-field events in the history UI and undo toasts.

---

## 13. Timezone-Agnostic UTC Calendar Arithmetic
- **Context**: Dated deviations span days across daylight savings transitions and user timezone shifts.
- **Decision**: All date calculations operate on canonical ISO strings (`YYYY-MM-DD`) and UTC millisecond timestamps (`Date.UTC`), completely bypassing local machine time offsets.
- **Rationale**: Prevents off-by-one day errors during DST transitions (e.g., 23-hour or 25-hour calendar days) and ensures deterministic daily slicing across all client and server environments.

---

## 14. Clamping and Bound Guarantees for Deviations
- **Context**: Users may log delta reductions that exceed their baseline habits (e.g. baseline AC 2h, delta -4h) or extreme overrides.
- **Decision**: Apply clamp rules in the engine (`Math.max(min, Math.min(max, effectiveValue))`), reporting all clamped fields explicitly in `DayResult.clampedFields`.
- **Rationale**: Physical usage cannot drop below 0 or exceed 24 hours per day. Transparently reporting clamped fields ensures the user UI can flag clamped inputs without throwing or crashing calculations.

---

## 15. Public Methodology Page with Zero Network Dependency
- **Context**: The `/methodology` page must serve as an open science resource for visitors, students, and researchers with radical transparency.
- **Decision**: Power the entire `/methodology` page from bundled `factors.v1.json` and pure engine calculation functions, requiring zero authentication and zero network round-trips.
- **Rationale**: Guarantees instant load times, full offline availability, and ensures all formulas and live worked examples are computed with 100% mathematical fidelity directly from the client engine.


