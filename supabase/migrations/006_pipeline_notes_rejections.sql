create table pipeline_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references auth.users(id),
  source text not null default 'system' check (source in ('system', 'recruiter', 'ai')),
  created_at timestamptz not null default now()
);
create index pipeline_events_application_idx on pipeline_events(application_id);
create index pipeline_events_company_idx on pipeline_events(company_id);

create table notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger notes_set_updated_at before update on notes
  for each row execute function set_updated_at();
create index notes_application_idx on notes(application_id);

create table rejection_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  rejected_by uuid not null references auth.users(id),
  stage text not null,
  internal_reason text not null default '',
  ai_draft text not null default '',
  final_message text not null default '',
  feedback_mode text not null default 'concise' check (feedback_mode in ('concise', 'detailed', 'none')),
  email_log_id uuid,
  created_at timestamptz not null default now()
);
create index rejection_records_application_idx on rejection_records(application_id);
