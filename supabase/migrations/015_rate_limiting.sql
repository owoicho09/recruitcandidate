-- Rate limiting for public, unauthenticated endpoints (login, signup,
-- forgot-password, contact, support, application submission) — these had no
-- abuse protection at all despite a RATE_LIMIT_SECRET env var implying it was
-- planned. Postgres-backed rather than Redis: no new external service to
-- provision, and this app already treats Postgres as its source of truth.
-- Service-role only — never exposed to anon/authenticated clients.

create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_key_created_idx on rate_limit_hits(key, created_at);

alter table rate_limit_hits enable row level security;
-- no policies — service-role bypasses RLS; no anon/authenticated access needed or granted.
