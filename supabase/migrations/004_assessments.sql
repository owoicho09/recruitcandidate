create table assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  duration_minutes integer not null default 30,
  pass_mark integer not null default 70,
  randomize_order boolean not null default false,
  deadline_days integer not null default 5,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  unique (company_id, job_id)
);
create index assessments_company_idx on assessments(company_id);

create table assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  type text not null check (type in ('multiple_choice', 'written')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb,
  points integer not null default 10,
  section text not null default 'General',
  order_index integer not null default 0
);
create index assessment_questions_assessment_idx on assessment_questions(assessment_id);

create table assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  token_hash text not null unique,
  starts_at timestamptz,
  expires_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  section_scores jsonb not null default '{}'::jsonb,
  passed boolean,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'expired'))
);
create index assessment_attempts_application_idx on assessment_attempts(application_id);
create index assessment_attempts_token_idx on assessment_attempts(token_hash);
