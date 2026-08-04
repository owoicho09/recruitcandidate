-- Row Level Security — every tenant-owned table is scoped to the caller's
-- company membership(s) via auth_company_ids()/auth_has_role(), defined
-- below. Candidate-facing token flows (application submission, assessment/
-- video-interview attempts) never authenticate as a Supabase user — those
-- routes use the service-role client server-side after validating the token
-- hash in application code, per spec Part J/Q.

-- Resolves the caller's company_id memberships for use in RLS policies.
-- SECURITY DEFINER + a fixed search_path so it can read company_members
-- regardless of the calling role's own RLS visibility into that table.
create or replace function auth_company_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from company_members
  where user_id = auth.uid() and status = 'active';
$$;

-- Checks the caller's role within a SPECIFIC company (never "any company the
-- user belongs to") so role checks can't leak across tenants.
create or replace function auth_has_role(target_company_id uuid, min_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_members
    where user_id = auth.uid()
      and company_id = target_company_id
      and status = 'active'
      and (
        case min_role
          when 'reviewer' then role in ('reviewer', 'hiring_manager', 'recruiter', 'admin', 'owner')
          when 'hiring_manager' then role in ('hiring_manager', 'recruiter', 'admin', 'owner')
          when 'recruiter' then role in ('recruiter', 'admin', 'owner')
          when 'admin' then role in ('admin', 'owner')
          when 'owner' then role = 'owner'
          else false
        end
      )
  );
$$;

-- profiles ------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select_own on profiles for select
  using (id = auth.uid());
create policy profiles_update_own on profiles for update
  using (id = auth.uid());
create policy profiles_insert_own on profiles for insert
  with check (id = auth.uid());

-- companies -------------------------------------------------------------
alter table companies enable row level security;

create policy companies_select_member on companies for select
  using (id in (select auth_company_ids()));
create policy companies_update_admin on companies for update
  using (auth_has_role(id, 'admin'));

-- companies are inserted via a trusted server route (signup flow), not directly by clients.

-- company_members --------------------------------------------------------
alter table company_members enable row level security;

create policy company_members_select_same_company on company_members for select
  using (company_id in (select auth_company_ids()));
create policy company_members_update_admin on company_members for update
  using (auth_has_role(company_id, 'admin'));
create policy company_members_delete_admin on company_members for delete
  using (auth_has_role(company_id, 'admin') and role <> 'owner');

-- plans -------------------------------------------------------------------
alter table plans enable row level security;

create policy plans_select_all on plans for select
  using (true);

-- subscriptions / billing --------------------------------------------------
alter table subscriptions enable row level security;
create policy subscriptions_select_member on subscriptions for select
  using (company_id in (select auth_company_ids()));
create policy subscriptions_update_owner on subscriptions for update
  using (auth_has_role(company_id, 'owner'));

alter table subscription_events enable row level security;
create policy subscription_events_select_owner on subscription_events for select
  using (company_id is not null and auth_has_role(company_id, 'owner'));

alter table payments enable row level security;
create policy payments_select_owner on payments for select
  using (auth_has_role(company_id, 'owner'));

alter table usage_periods enable row level security;
create policy usage_periods_select_member on usage_periods for select
  using (company_id in (select auth_company_ids()));

-- jobs ----------------------------------------------------------------------
alter table jobs enable row level security;
create policy jobs_select_member on jobs for select
  using (company_id in (select auth_company_ids()));
create policy jobs_insert_recruiter on jobs for insert
  with check (auth_has_role(company_id, 'recruiter'));
create policy jobs_update_recruiter on jobs for update
  using (auth_has_role(company_id, 'recruiter'));
create policy jobs_delete_admin on jobs for delete
  using (auth_has_role(company_id, 'admin'));

-- published jobs are additionally exposed to anonymous candidates through a
-- public, read-only view (see 011_public_career_page_view.sql) rather than
-- by relaxing this table's RLS.

-- candidates ------------------------------------------------------------
alter table candidates enable row level security;
create policy candidates_select_member on candidates for select
  using (company_id in (select auth_company_ids()));
create policy candidates_update_recruiter on candidates for update
  using (auth_has_role(company_id, 'recruiter'));
-- inserts happen via the service-role client from the public application route.

-- applications ------------------------------------------------------------
alter table applications enable row level security;
create policy applications_select_member on applications for select
  using (company_id in (select auth_company_ids()));
create policy applications_update_reviewer on applications for update
  using (auth_has_role(company_id, 'reviewer'));

-- ai_screening_results ------------------------------------------------------
alter table ai_screening_results enable row level security;
create policy ai_screening_results_select_member on ai_screening_results for select
  using (exists (
    select 1 from applications a
    where a.id = application_id and a.company_id in (select auth_company_ids())
  ));
create policy ai_screening_results_update_recruiter on ai_screening_results for update
  using (exists (
    select 1 from applications a
    where a.id = application_id and auth_has_role(a.company_id, 'recruiter')
  ));

-- assessments ---------------------------------------------------------------
alter table assessments enable row level security;
create policy assessments_select_member on assessments for select
  using (company_id in (select auth_company_ids()));
create policy assessments_write_recruiter on assessments for all
  using (auth_has_role(company_id, 'recruiter'))
  with check (auth_has_role(company_id, 'recruiter'));

alter table assessment_questions enable row level security;
create policy assessment_questions_select_member on assessment_questions for select
  using (exists (
    select 1 from assessments s where s.id = assessment_id and s.company_id in (select auth_company_ids())
  ));
create policy assessment_questions_write_recruiter on assessment_questions for all
  using (exists (select 1 from assessments s where s.id = assessment_id and auth_has_role(s.company_id, 'recruiter')))
  with check (exists (select 1 from assessments s where s.id = assessment_id and auth_has_role(s.company_id, 'recruiter')));

alter table assessment_attempts enable row level security;
create policy assessment_attempts_select_member on assessment_attempts for select
  using (exists (select 1 from applications a where a.id = application_id and a.company_id in (select auth_company_ids())));

-- video_interviews ------------------------------------------------------------
alter table video_interviews enable row level security;
create policy video_interviews_select_member on video_interviews for select
  using (company_id in (select auth_company_ids()));
create policy video_interviews_write_recruiter on video_interviews for all
  using (auth_has_role(company_id, 'recruiter'))
  with check (auth_has_role(company_id, 'recruiter'));

alter table video_questions enable row level security;
create policy video_questions_select_member on video_questions for select
  using (exists (select 1 from video_interviews v where v.id = video_interview_id and v.company_id in (select auth_company_ids())));
create policy video_questions_write_recruiter on video_questions for all
  using (exists (select 1 from video_interviews v where v.id = video_interview_id and auth_has_role(v.company_id, 'recruiter')))
  with check (exists (select 1 from video_interviews v where v.id = video_interview_id and auth_has_role(v.company_id, 'recruiter')));

alter table video_interview_attempts enable row level security;
create policy video_interview_attempts_select_member on video_interview_attempts for select
  using (exists (select 1 from applications a where a.id = application_id and a.company_id in (select auth_company_ids())));

alter table video_responses enable row level security;
create policy video_responses_select_member on video_responses for select
  using (exists (
    select 1 from video_interview_attempts va
    join applications a on a.id = va.application_id
    where va.id = attempt_id and a.company_id in (select auth_company_ids())
  ));
create policy video_responses_update_reviewer on video_responses for update
  using (exists (
    select 1 from video_interview_attempts va
    join applications a on a.id = va.application_id
    where va.id = attempt_id and auth_has_role(a.company_id, 'reviewer')
  ));

-- pipeline_events / notes / rejection_records ---------------------------------
alter table pipeline_events enable row level security;
create policy pipeline_events_select_member on pipeline_events for select
  using (company_id in (select auth_company_ids()));

alter table notes enable row level security;
create policy notes_select_member on notes for select
  using (company_id in (select auth_company_ids()));
create policy notes_write_reviewer on notes for insert
  with check (auth_has_role(company_id, 'reviewer'));
create policy notes_update_author on notes for update
  using (author_id = auth.uid());

alter table rejection_records enable row level security;
create policy rejection_records_select_member on rejection_records for select
  using (company_id in (select auth_company_ids()));
create policy rejection_records_write_reviewer on rejection_records for insert
  with check (auth_has_role(company_id, 'reviewer'));

-- email_templates / email_logs -------------------------------------------------
alter table email_templates enable row level security;
create policy email_templates_select_member on email_templates for select
  using (company_id in (select auth_company_ids()));
create policy email_templates_write_admin on email_templates for update
  using (auth_has_role(company_id, 'admin'));

alter table email_logs enable row level security;
create policy email_logs_select_member on email_logs for select
  using (company_id in (select auth_company_ids()));

-- team_invitations / audit_logs -------------------------------------------------
alter table team_invitations enable row level security;
create policy team_invitations_select_admin on team_invitations for select
  using (auth_has_role(company_id, 'admin'));
create policy team_invitations_write_admin on team_invitations for all
  using (auth_has_role(company_id, 'admin'))
  with check (auth_has_role(company_id, 'admin'));

alter table audit_logs enable row level security;
create policy audit_logs_select_admin on audit_logs for select
  using (auth_has_role(company_id, 'admin'));

-- background_jobs ---------------------------------------------------------------
alter table background_jobs enable row level security;
create policy background_jobs_select_admin on background_jobs for select
  using (company_id is not null and auth_has_role(company_id, 'admin'));
