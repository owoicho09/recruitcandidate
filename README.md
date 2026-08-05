# RecruitCandidates

Multi-tenant AI recruitment SaaS — branded career pages, semantic CV
screening, assessments, asynchronous video interviews, and a qualified
candidate workspace. Full product scope: `RecruitCandidates_Full_Project_Scope.md`.

## Demo mode

This app runs in **demo mode** by default — no external accounts required.
With `NEXT_PUBLIC_SUPABASE_URL` unset (the default in `.env.example`), every
integration falls back to a mock implementation:

- **Auth** — a signed cookie session backed by an in-memory store, seeded
  with demo accounts (see below). Real Supabase Auth activates automatically
  once Supabase credentials are set and `NEXT_PUBLIC_DEMO_MODE=false`.
- **Database** — an in-memory store (`src/lib/data/store.ts`) seeded from
  `src/lib/data/fixtures.ts`. It resets on server restart. `supabase/migrations`
  contains the real schema, ready to apply against a live Supabase project.
- **AI (Claude)** — `src/lib/ai/claude.ts` returns schema-correct, heuristic
  screening/interview/rejection output without calling any API.
- **Email (Resend)** — `src/lib/email/resend.ts` writes to the in-memory
  email log instead of sending; the Email Log page reads from the same log.
- **Billing (Paystack)** — checkout is stubbed to activate a subscription
  immediately; the webhook route still does real HMAC signature validation
  (`src/lib/billing/paystack.ts`), it just has nothing valid to verify against
  without a real secret key.

### Demo accounts

Sign in at `/login` with the demo shortcut, or manually with:

| Email | Role |
| --- | --- |
| amara@northwindlabs.com | owner |
| david@northwindlabs.com | admin |
| priya@northwindlabs.com | recruiter |
| james@northwindlabs.com | hiring_manager |
| grace@northwindlabs.com | reviewer |

Password for every demo account: `demopass`.

Platform admin console: `/platform-admin`, any email/password when
`PLATFORM_ADMIN_EMAIL` is unset.

## Going live

1. Create a Supabase project, then run `node scripts/run-migrations.mjs`
   (`SUPABASE_DB_URL` pointed at the project's pooler connection string) —
   idempotent, applies `supabase/migrations` in order and seeds plans/add-ons.
2. Fill in `.env.local` (copy from `.env.example`): Supabase URL/keys, an
   Anthropic (Claude) key, a Resend key, and Paystack keys.
3. Create the 6 subscription Plan objects (Starter/Growth/Scale × monthly/annual)
   in the Paystack dashboard, paste their codes into the `PAYSTACK_*_PLAN_CODE`
   vars, then run `node scripts/sync-plan-codes.mjs` to push them into the
   `plans` table — that DB row, not the env var, is what checkout reads.
   Add-ons and credit packs don't need Paystack Plan codes (they're one-time
   transactions or ride the base subscription's renewal — see
   `src/app/api/webhooks/paystack/route.ts`).
4. Set `NEXT_PUBLIC_DEMO_MODE=false`.
5. Each service module under `src/lib/services/*` and `src/lib/ai`,
   `src/lib/email`, `src/lib/billing` checks `src/lib/env.ts`'s `flags` object
   and switches to its live branch automatically — no UI code changes needed.
   `src/lib/services/jobs.ts` is the reference pattern for the Supabase branch;
   extending the remaining services the same way is mechanical since the
   table/column names already match the migrations.

## Development

```bash
npm run dev     # starts on http://localhost:3000
npm run build
npm run lint
```

`dev`/`build` are pinned to `--webpack`. Next.js 16 defaults to Turbopack, but
on this machine Turbopack's PostCSS subprocess crashes with
`STATUS_DLL_INIT_FAILED (0xc0000142)` while compiling `globals.css` (Windows-
specific native-module/subprocess-spawn issue, unrelated to app code — see
the panic log Next.js prints for the exact trace). Try `npm run dev:turbo` on
a machine where Turbopack works fine; it's typically faster.

Next.js 16 renamed `middleware.ts` to `proxy.ts` (session/tenant routing
lives there) — see `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
if anything here looks unfamiliar against older Next.js knowledge.
