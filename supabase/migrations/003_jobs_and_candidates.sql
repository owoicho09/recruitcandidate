-- jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  slug text not null,
  department text not null default '',
  location text not null default '',
  work_arrangement text not null default 'onsite' check (work_arrangement in ('onsite', 'hybrid', 'remote')),
  employment_type text not null default 'full_time' check (employment_type in ('full_time', 'part_time', 'contract', 'internship', 'temporary')),
  salary_min integer,
  salary_max integer,
  currency text not null default 'NGN',
  summary text not null default '',
  description text not null default '',
  responsibilities jsonb not null default '[]'::jsonb,
  required_skills jsonb not null default '[]'::jsonb,
  preferred_skills jsonb not null default '[]'::jsonb,
  min_experience integer,
  education_requirements text,
  other_requirements jsonb not null default '[]'::jsonb,
  application_questions jsonb not null default '[]'::jsonb,
  screening_weights jsonb not null default '{"required_skills":30,"relevant_experience":25,"transferable_experience":15,"education":10,"certifications":5,"achievements":10,"application_answers":5}'::jsonb,
  openings_count integer not null default 1,
  closing_date date,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'closed', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, slug)
);
create trigger jobs_set_updated_at before update on jobs
  for each row execute function set_updated_at();
create index jobs_company_idx on jobs(company_id);
create index jobs_company_status_idx on jobs(company_id, status);

-- candidates
create table candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  location text,
  linkedin_url text,
  portfolio_url text,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);
create index candidates_company_idx on candidates(company_id);

-- applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  cv_path text not null,
  cv_filename text not null,
  cv_text text,
  cv_parse_status text not null default 'pending' check (cv_parse_status in ('pending', 'parsed', 'unreadable', 'failed')),
  cover_note text,
  application_answers jsonb not null default '{}'::jsonb,
  stage text not null default 'applied' check (stage in ('applied', 'cv_screened', 'shortlisted', 'assessment', 'video_interview', 'qualified', 'rejected', 'on_hold', 'withdrawn')),
  recommendation text check (recommendation in ('strong_match', 'possible_match', 'manual_review', 'low_match')),
  assigned_member_id uuid references auth.users(id),
  tracking_token_hash text not null unique,
  applied_at timestamptz not null default now(),
  stage_updated_at timestamptz not null default now(),
  rejected_at timestamptz,
  qualified_at timestamptz
);
create index applications_company_idx on applications(company_id);
create index applications_job_idx on applications(job_id);
create index applications_candidate_idx on applications(candidate_id);
create index applications_stage_idx on applications(company_id, stage);
create index applications_tracking_token_idx on applications(tracking_token_hash);

-- ai_screening_results
create table ai_screening_results (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  overall_score integer not null,
  skills_match integer not null,
  experience_match integer not null,
  education_match integer,
  transferable_skills jsonb not null default '[]'::jsonb,
  matched_requirements jsonb not null default '[]'::jsonb,
  missing_minimum_requirements jsonb not null default '[]'::jsonb,
  missing_preferred_requirements jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  explanation text not null default '',
  recommendation text not null check (recommendation in ('strong_match', 'possible_match', 'manual_review', 'low_match')),
  review_state text not null default 'ai_screening_complete' check (review_state in ('ai_screening_complete', 'manual_review_required', 'recruiter_approved_shortlist', 'recruiter_rejected', 'screening_failed', 'cv_unreadable')),
  manual_override text check (manual_override in ('strong_match', 'possible_match', 'manual_review', 'low_match')),
  model_version text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);
create index ai_screening_results_application_idx on ai_screening_results(application_id);
