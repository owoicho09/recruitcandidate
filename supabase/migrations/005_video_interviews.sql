create table video_interviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  deadline_days integer not null default 7,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  unique (company_id, job_id)
);
create index video_interviews_company_idx on video_interviews(company_id);

create table video_questions (
  id uuid primary key default gen_random_uuid(),
  video_interview_id uuid not null references video_interviews(id) on delete cascade,
  prompt text not null,
  prep_seconds integer not null default 30,
  response_seconds integer not null default 90,
  retries_allowed boolean not null default true,
  max_retries integer not null default 1,
  scoring_criteria jsonb not null default '[]'::jsonb,
  order_index integer not null default 0
);
create index video_questions_interview_idx on video_questions(video_interview_id);

create table video_interview_attempts (
  id uuid primary key default gen_random_uuid(),
  video_interview_id uuid not null references video_interviews(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'expired'))
);
create index video_interview_attempts_application_idx on video_interview_attempts(application_id);
create index video_interview_attempts_token_idx on video_interview_attempts(token_hash);

create table video_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references video_interview_attempts(id) on delete cascade,
  question_id uuid not null references video_questions(id) on delete cascade,
  storage_path text not null,
  duration_seconds integer not null default 0,
  transcript text,
  transcript_status text not null default 'pending' check (transcript_status in ('pending', 'processing', 'complete', 'failed')),
  ai_score integer,
  ai_analysis jsonb,
  employer_score integer,
  created_at timestamptz not null default now()
);
create index video_responses_attempt_idx on video_responses(attempt_id);
