-- Part R: background processing (CV extraction, AI screening, transcription,
-- interview analysis, bulk emails, exports, storage cleanup).
create table background_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index background_jobs_company_idx on background_jobs(company_id);
create index background_jobs_status_idx on background_jobs(status);
