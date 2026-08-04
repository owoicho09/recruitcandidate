# Services layer

Every module here is the single data-access point for one entity group, used
by both Server Components and Route Handlers. In demo mode (the default —
see `src/lib/env.ts`) each function reads/writes `mockStore`
(`src/lib/data/store.ts`), an in-memory copy of the fixtures seeded from
`src/lib/data/fixtures.ts`.

`src/lib/services/jobs.ts` additionally implements a live Supabase branch,
selected automatically when `flags.hasSupabase` is true, as the reference
pattern for wiring the rest of this layer to a real database: the table/column
names match `supabase/migrations`, so extending any other service the same
way is mechanical — swap the `mockStore` array access for the equivalent
`supabase.from(table)` call, keeping the same return shape.

Nothing here does authorization — callers (route handlers, server actions)
are expected to have already resolved a `Session` via
`src/lib/auth/session.ts` and to scope every read/write to `session.companyId`.
