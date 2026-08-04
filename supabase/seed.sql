-- Default plans — spec Part K §22. Run after all migrations.
-- Replace paystack_plan_code values with the codes from your Paystack dashboard
-- (or leave them and set PAYSTACK_*_PLAN_CODE env vars — the app's plans table
-- is the display/limits source of truth; env vars are only the initial mapping).

insert into plans (name, slug, currency, amount, interval, paystack_plan_code, limits, features, active) values
(
  'Starter', 'starter', 'NGN', 20000, 'monthly', '',
  '{"active_jobs":3,"applications":200,"ai_screenings":200,"assessment_invitations":30,"video_interview_candidates":20,"team_members":2}',
  '["Branded career page", "Standard email templates", "3-month video retention"]',
  true
),
(
  'Growth', 'growth', 'NGN', 50000, 'monthly', '',
  '{"active_jobs":10,"applications":1000,"ai_screenings":1000,"assessment_invitations":200,"video_interview_candidates":100,"team_members":5}',
  '["Candidate comparison", "Adjustable screening weights", "Editable email templates", "12-month video retention"]',
  true
),
(
  'Pro', 'pro', 'NGN', 100000, 'monthly', '',
  '{"active_jobs":30,"applications":5000,"ai_screenings":5000,"assessment_invitations":1000,"video_interview_candidates":500,"team_members":15}',
  '["Advanced analytics", "Priority processing", "Longer retention", "Custom branding controls", "Priority support"]',
  true
),
(
  'Enterprise', 'enterprise', 'NGN', 0, 'monthly', '',
  '{"active_jobs":999,"applications":999999,"ai_screenings":999999,"assessment_invitations":999999,"video_interview_candidates":999999,"team_members":999}',
  '["Recruitment agency workspaces", "Custom domain", "SSO", "Custom retention", "Dedicated support"]',
  true
);

-- Monthly amounts above also serve as the base for annual pricing (typically
-- displayed at a discount in the UI) — see src/components/marketing/pricing-table.tsx.
-- Add matching annual rows here if you want annual billing as a distinct Paystack plan
-- rather than computing the discount client-side.
