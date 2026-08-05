-- Pricing/plans/add-ons/usage overhaul. Idempotent — safe to rerun.

-- ============================================================================
-- plans: pro -> scale, composite (slug, interval) identity, simplified limits
-- ============================================================================
-- Drop the old constraints before touching data — the old slug check doesn't
-- allow 'scale' yet, so renaming 'pro' rows must happen after this.
alter table plans drop constraint if exists plans_slug_check;
alter table plans drop constraint if exists plans_slug_key;

update plans set slug = 'scale' where slug = 'pro';

alter table plans add constraint plans_slug_check check (slug in ('starter', 'growth', 'scale', 'enterprise'));
alter table plans add constraint plans_slug_interval_key unique (slug, interval);

-- Seed the real 8 rows (4 tiers x 2 intervals; Enterprise has no self-serve
-- checkout but keeps a display row for the pricing page). Annual = monthly x 10
-- (two months free). Limits shrink to {active_jobs, applications, team_members}
-- — AI screening/assessment/video-interview usage is now folded into a single
-- "applications" allowance (see usage-tracking service), not metered separately.
insert into plans (name, slug, currency, amount, interval, paystack_plan_code, limits, features, active) values
('Starter', 'starter', 'NGN', 20000, 'monthly', '',
  '{"active_jobs":5,"applications":300,"team_members":3}',
  '["Branded company career page", "Job creation and publishing", "Candidate application forms", "CV upload and applicant database", "AI CV screening", "Applicant pipeline", "Assessments", "Prerecorded video interviews", "Video transcription and AI analysis", "Qualified candidates section", "Rejection feedback drafts", "Email notifications and reminders"]',
  true),
('Starter', 'starter', 'NGN', 200000, 'annual', '',
  '{"active_jobs":5,"applications":300,"team_members":3}',
  '["Branded company career page", "Job creation and publishing", "Candidate application forms", "CV upload and applicant database", "AI CV screening", "Applicant pipeline", "Assessments", "Prerecorded video interviews", "Video transcription and AI analysis", "Qualified candidates section", "Rejection feedback drafts", "Email notifications and reminders"]',
  true),
('Growth', 'growth', 'NGN', 50000, 'monthly', '',
  '{"active_jobs":15,"applications":1500,"team_members":8}',
  '["Everything in Starter", "live_ai_interviewer", "Candidate comparison", "Adjustable CV screening criteria", "Custom email templates", "Advanced applicant filters", "Recruitment analytics", "Bulk assessment invitations", "Bulk video interview invitations", "Priority support"]',
  true),
('Growth', 'growth', 'NGN', 500000, 'annual', '',
  '{"active_jobs":15,"applications":1500,"team_members":8}',
  '["Everything in Starter", "live_ai_interviewer", "Candidate comparison", "Adjustable CV screening criteria", "Custom email templates", "Advanced applicant filters", "Recruitment analytics", "Bulk assessment invitations", "Bulk video interview invitations", "Priority support"]',
  true),
('Scale', 'scale', 'NGN', 100000, 'monthly', '',
  '{"active_jobs":30,"applications":5000,"team_members":20}',
  '["Everything in Growth", "live_ai_interviewer", "Bulk candidate actions", "Bulk stage movement", "Deeper recruitment analytics", "Priority AI processing", "Priority transcription", "Longer video retention", "Higher export limits", "Priority WhatsApp and email support"]',
  true),
('Scale', 'scale', 'NGN', 1000000, 'annual', '',
  '{"active_jobs":30,"applications":5000,"team_members":20}',
  '["Everything in Growth", "live_ai_interviewer", "Bulk candidate actions", "Bulk stage movement", "Deeper recruitment analytics", "Priority AI processing", "Priority transcription", "Longer video retention", "Higher export limits", "Priority WhatsApp and email support"]',
  true),
('Enterprise', 'enterprise', 'NGN', 0, 'monthly', '',
  '{"active_jobs":999999,"applications":999999,"team_members":999999}',
  '["Everything in Scale", "live_ai_interviewer", "Multiple branches", "Recruitment agency workspaces", "Custom domains", "SSO", "Custom retention", "Dedicated onboarding", "Custom reporting", "Higher live AI interview usage"]',
  true),
('Enterprise', 'enterprise', 'NGN', 0, 'annual', '',
  '{"active_jobs":999999,"applications":999999,"team_members":999999}',
  '["Everything in Scale", "live_ai_interviewer", "Multiple branches", "Recruitment agency workspaces", "Custom domains", "SSO", "Custom retention", "Dedicated onboarding", "Custom reporting", "Higher live AI interview usage"]',
  true)
on conflict (slug, interval) do update set
  name = excluded.name, amount = excluded.amount, limits = excluded.limits, features = excluded.features, active = excluded.active;

-- ============================================================================
-- addon_products: purchasable catalog (public-readable, like plans)
-- ============================================================================
create table if not exists addon_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  kind text not null check (kind in ('active_jobs', 'applications', 'team_members', 'live_ai_interviews')),
  billing_type text not null check (billing_type in ('recurring', 'one_time')),
  quantity integer not null check (quantity > 0),
  amount integer not null check (amount >= 0),
  currency text not null default 'NGN',
  min_plan_slug text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into addon_products (sku, name, kind, billing_type, quantity, amount, min_plan_slug) values
('extra_jobs_5', '5 extra active jobs', 'active_jobs', 'recurring', 5, 10000, null),
('extra_jobs_10', '10 extra active jobs', 'active_jobs', 'recurring', 10, 18000, null),
('extra_jobs_20', '20 extra active jobs', 'active_jobs', 'recurring', 20, 30000, null),
('extra_applications_500', '500 extra applications', 'applications', 'one_time', 500, 15000, null),
('extra_applications_1000', '1,000 extra applications', 'applications', 'one_time', 1000, 25000, null),
('extra_applications_2500', '2,500 extra applications', 'applications', 'one_time', 2500, 50000, null),
('extra_applications_5000', '5,000 extra applications', 'applications', 'one_time', 5000, 85000, null),
('extra_team_members_3', '3 extra team members', 'team_members', 'recurring', 3, 5000, null),
('extra_team_members_10', '10 extra team members', 'team_members', 'recurring', 10, 15000, null),
('live_ai_credits_10', '10 live AI interview credits', 'live_ai_interviews', 'one_time', 10, 8000, 'growth'),
('live_ai_credits_25', '25 live AI interview credits', 'live_ai_interviews', 'one_time', 25, 18000, 'growth'),
('live_ai_credits_50', '50 live AI interview credits', 'live_ai_interviews', 'one_time', 50, 32000, 'growth')
on conflict (sku) do update set
  name = excluded.name, kind = excluded.kind, billing_type = excluded.billing_type,
  quantity = excluded.quantity, amount = excluded.amount, min_plan_slug = excluded.min_plan_slug;

alter table addon_products enable row level security;
drop policy if exists addon_products_select_all on addon_products;
create policy addon_products_select_all on addon_products for select using (true);

-- ============================================================================
-- company_addons: what a company currently owns
-- ============================================================================
create table if not exists company_addons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  addon_product_id uuid not null references addon_products(id),
  sku text not null,
  quantity integer not null,
  billing_type text not null check (billing_type in ('recurring', 'one_time')),
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  period_start timestamptz not null default now(),
  period_end timestamptz,
  paystack_reference text,
  created_at timestamptz not null default now()
);
create index if not exists company_addons_company_idx on company_addons(company_id);
create index if not exists company_addons_status_idx on company_addons(status);

alter table company_addons enable row level security;
drop policy if exists company_addons_select_member on company_addons;
create policy company_addons_select_member on company_addons for select
  using (company_id in (select auth_company_ids()));
-- writes go through the admin client (webhook fulfillment), matching pipeline_events.

-- ============================================================================
-- subscriptions: authorization code for recharging recurring add-ons
-- ============================================================================
alter table subscriptions add column if not exists paystack_authorization_code text;

-- ============================================================================
-- usage_periods: drop metrics now folded into "applications" or live-counted;
-- add a persistent (non-period-reset) live AI interview credit balance.
-- ============================================================================
alter table usage_periods drop column if exists active_jobs;
alter table usage_periods drop column if exists ai_screenings;
alter table usage_periods drop column if exists assessment_invitations;
alter table usage_periods drop column if exists video_interview_candidates;
alter table usage_periods drop column if exists team_members;
alter table usage_periods add column if not exists live_ai_interview_credits integer not null default 0;

-- ============================================================================
-- increment_usage RPC: shrink the allowlist to what's still counter-based.
-- live_ai_interview_credits accepts negative amounts (consumption).
-- ============================================================================
create or replace function increment_usage(p_company_id uuid, p_metric text, p_amount integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_metric not in ('applications', 'live_ai_interview_credits') then
    raise exception 'Unknown usage metric: %', p_metric;
  end if;

  execute format(
    'update usage_periods set %I = greatest(0, %I + $1) where company_id = $2 and period_start <= now() and period_end >= now()',
    p_metric, p_metric
  ) using p_amount, p_company_id;
end;
$$;

grant execute on function increment_usage(uuid, text, integer) to authenticated, service_role;
