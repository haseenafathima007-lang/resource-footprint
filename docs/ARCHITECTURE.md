# Resource Footprint - System Architecture

This document describes the architectural foundations, database schema, security model, and service layer established in Phase 2.

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    auth_users ||--|| profiles : "has profile (1:1)"
    auth_users ||--o{ baseline_profiles : "owns (1:N)"
    auth_users ||--o{ deviations : "logs (1:N)"
    factor_sets ||--o{ baseline_profiles : "references (1:N)"

    auth_users {
        uuid id PK
        string email
        string encrypted_password
        timestamptz created_at
    }

    profiles {
        uuid id PK,FK "references auth.users(id)"
        text display_name "max 80 chars"
        timestamptz created_at
        timestamptz updated_at
    }

    factor_sets {
        text version PK "e.g. 1.0.0"
        text region "e.g. global"
        date effective_from
        jsonb payload "Single source: factors.v1.json"
        timestamptz created_at
    }

    baseline_profiles {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "references auth.users(id)"
        date effective_from "default current_date"
        int household_size "1-20"
        numeric shower_minutes_per_day "0-120"
        text shower_heater "'none' | 'electric'"
        numeric ac_hours_per_day "0-24"
        numeric fan_hours_per_day "0-24"
        numeric laptop_hours_per_day "0-24"
        numeric laundry_loads_per_week "0-50"
        text laundry_machine "'topLoad' | 'frontLoad'"
        text factors_version FK "references factor_sets(version)"
        timestamptz created_at
    }

    deviations {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "references auth.users(id)"
        date start_date
        date end_date "check end_date >= start_date"
        text field "shower/ac/fan/laptop/laundry"
        text mode "'delta' | 'override'"
        numeric value
        text note "max 200 chars"
        timestamptz created_at
    }
```

---

## 2. Row-Level Security (RLS) Policy Matrix

All public schema tables enforce RLS. Granular, single-operation policies ensure optimal query planner performance via `(select auth.uid())`.

| Table | Role | SELECT | INSERT | UPDATE | DELETE | Policy Details |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`profiles`** | `anon` | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | Privileges revoked |
| | `authenticated` | ✅ Own row | ❌ Denied | ✅ Own row | ❌ Denied | Managed via `auth.users` trigger; client insert/delete disallowed |
| **`factor_sets`** | `anon` | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | Simulator accessible pre-signup; immutable |
| | `authenticated` | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | Read-only; new versions added via migrations only |
| **`baseline_profiles`**| `anon` | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | Privileges revoked |
| | `authenticated` | ✅ Own rows | ✅ `WITH CHECK` | ✅ `WITH CHECK` | ✅ Own rows | `user_id = (select auth.uid())` strictly enforced |
| **`deviations`** | `anon` | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | Privileges revoked |
| | `authenticated` | ✅ Own rows | ✅ `WITH CHECK` | ✅ `WITH CHECK` | ✅ Own rows | `user_id = (select auth.uid())` strictly enforced |

---

## 3. Baseline Versioning & Append-Only History

1. **Reproducibility**:
   Past resource consumption must remain reproducible even after habits change. Updating a baseline never overwrites previous historical baselines.
2. **Effective Date Semantics**:
   - Each baseline row records `effective_from DATE`.
   - A unique constraint enforces `UNIQUE (user_id, effective_from)`.
   - The user's **current** baseline is defined as:
     ```sql
     select * from baseline_profiles
     where user_id = auth.uid() and effective_from <= current_date
     order by effective_from desc
     limit 1;
     ```
   - Modifying habits for today upserts today's row; modifying habits historically creates a new effective entry.

---

## 4. Single Source of Truth for Conversion Factors

1. **`src/data/factors.v1.json`**:
   The authoritative, human-readable specification of conversion factors and empirical sources.
2. **`scripts/generate-factor-seed.ts`**:
   Validates JSON structure, types, and invariant `low <= typical <= high` before generating `supabase/seed.sql`.
3. **Database Immobility**:
   The `public.factor_sets` table has no `UPDATE` or `DELETE` policies for any role. Published factors are immutable.

---

## 5. Service Layer & The `Result` Pattern

To prevent unhandled promise rejections and keep the UI decoupled from raw Postgres/Supabase exceptions:

```typescript
export type Result<T, E = ServiceError> =
  | { ok: true; data: T; error?: never }
  | { ok: false; error: E; data?: never };

export interface ServiceError {
  code: 'UNAUTHENTICATED' | 'VALIDATION' | 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN';
  message: string;
  details?: Record<string, string> | unknown;
}
```

### Pre-Validation Guarantee
Repositories validate domain constraints against `PROFILE_BOUNDS` via the pure calculation engine (`validateProfile`) **before** invoking the database. Out-of-bounds requests return a structured `VALIDATION` error immediately without incurring network latency.

---

## 6. Security Principles

- **Zero Client Service Role Key**: Only the `anon` / public key is bundled in the frontend. The `service_role` key never enters `src/`, `dist/`, or any environment accessible by client code.
- **Strict Environment Separation**: Secrets and sensitive overrides live only in `.env.local`, which is strictly gitignored. `.env.example` provides non-sensitive placeholders.
- **Granular Database Privileges**: Anonymous users are explicitly revoked access from all personal data tables.
