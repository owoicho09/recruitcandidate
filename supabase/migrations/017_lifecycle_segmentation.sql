-- Lifecycle segmentation + follow-up email automation. Tracks where each
-- company sits in the signup -> setup -> draft job -> subscribe -> publish ->
-- first application journey, logs the events that move them between
-- segments, and logs scheduled/sent follow-up emails so pending ones can be
-- cancelled the moment a company progresses past the segment that triggered
-- them.

alter table companies add column if not exists lifecycle_segment text not null default 'signup_incomplete_setup'
  check (lifecycle_segment in (
    'signup_incomplete_setup',
    'setup_complete_no_job',
    'draft_not_subscribed',
    'subscribed_not_published',
    'published_no_applications',
    'receiving_applications',
    'at_plan_limit'
  ));
alter table companies add column if not exists lifecycle_segment_updated_at timestamptz not null default now();

create table if not exists lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lifecycle_events_company_idx on lifecycle_events(company_id, created_at desc);
create index if not exists lifecycle_events_type_idx on lifecycle_events(event_type);

create table if not exists lifecycle_emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  recipient text not null,
  segment text not null,
  email_type text not null,
  subject text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  resend_id text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);
create index if not exists lifecycle_emails_company_idx on lifecycle_emails(company_id, created_at desc);
create index if not exists lifecycle_emails_pending_idx on lifecycle_emails(company_id, status) where status = 'scheduled';

alter table lifecycle_events enable row level security;
alter table lifecycle_emails enable row level security;
-- No policies — platform-internal (service-role / platform-admin only), never exposed to tenant clients.
