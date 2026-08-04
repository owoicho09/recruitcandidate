-- profiles: 1:1 extension of auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

-- companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  industry text,
  size text,
  country text,
  city text,
  website text,
  contact_email text,
  brand_color text not null default '#3730a3',
  timezone text not null default 'UTC',
  career_page_status text not null default 'unpublished' check (career_page_status in ('unpublished', 'published')),
  header_style text not null default 'gradient' check (header_style in ('gradient', 'solid', 'image')),
  social_links jsonb not null default '{}'::jsonb,
  recruitment_message text,
  show_company_details boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger companies_set_updated_at before update on companies
  for each row execute function set_updated_at();
create index companies_slug_idx on companies(slug);

-- company_members
create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'recruiter', 'hiring_manager', 'reviewer')),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz,
  unique (company_id, user_id)
);
create index company_members_company_idx on company_members(company_id);
create index company_members_user_idx on company_members(user_id);

-- plans (not tenant-scoped — readable by every authenticated user)
create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug in ('starter', 'growth', 'pro', 'enterprise')),
  currency text not null default 'NGN',
  amount integer not null,
  interval text not null check (interval in ('monthly', 'annual')),
  paystack_plan_code text not null default '',
  limits jsonb not null,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- subscriptions
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  plan_id uuid not null references plans(id),
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  status text not null default 'pending' check (status in ('pending', 'active', 'attention', 'non_renewing', 'past_due', 'canceled', 'completed', 'trialing')),
  period_start timestamptz not null default now(),
  period_end timestamptz not null default now(),
  next_payment_date timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_period_end timestamptz,
  canceled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();
create unique index subscriptions_company_idx on subscriptions(company_id);

-- subscription_events (idempotent Paystack webhook log)
create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  company_id uuid references companies(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index subscription_events_company_idx on subscription_events(company_id);

-- payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  paystack_reference text not null unique,
  paystack_transaction_id text,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null check (status in ('success', 'failed', 'abandoned')),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index payments_company_idx on payments(company_id);

-- usage_periods
create table usage_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  active_jobs integer not null default 0,
  applications integer not null default 0,
  ai_screenings integer not null default 0,
  assessment_invitations integer not null default 0,
  video_interview_candidates integer not null default 0,
  team_members integer not null default 0,
  storage_bytes bigint not null default 0
);
create index usage_periods_company_idx on usage_periods(company_id);
