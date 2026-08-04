# Database

Run the files in `migrations/` in numeric order against a fresh Supabase
Postgres database (`supabase db push`, the SQL editor, or `psql`), then run
`seed.sql` once.

- `001` — extensions + helper functions used by RLS policies (`auth_company_ids()`, `auth_has_role()`)
- `002` — companies, membership, plans, subscriptions, billing
- `003` — jobs, candidates, applications, AI screening results
- `004` — assessments
- `005` — video interviews
- `006` — pipeline events, notes, rejection records
- `007` — email templates + log
- `008` — team invitations, audit logs
- `009` — background job queue
- `010` — RLS policies (tenant isolation — see spec Part Q's acceptance test)
- `011` — the one deliberate public-read exception: published career pages/jobs
- `012` — private storage buckets (`cvs`, `videos`) + public `company-logos`

Every tenant table is scoped by `company_id` through `company_members`; there
is no table a signed-in user can read across companies except `plans`
(pricing is public) and published companies/jobs (the career page).
