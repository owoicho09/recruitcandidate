-- The anon key is public and every signed-in user holds a Supabase JWT, so any
-- write RLS allows can be made straight from the browser, skipping the API
-- routes' billing and role checks. This closes the holes that allowed that.

-- 1. Owners could update their own subscription row (status, period_end,
--    plan_id) and grant themselves any plan for free. Every legitimate write
--    goes through the service-role client in lib/services/plan-access.ts.
drop policy if exists subscriptions_update_owner on subscriptions;

-- 2. Admins could promote themselves (or anyone) to owner, or demote the
--    owner. The owner row is now untouchable here, nobody can edit their own
--    membership, and "owner" can't be granted.
drop policy if exists company_members_update_admin on company_members;
create policy company_members_update_admin on company_members for update
  using (auth_has_role(company_id, 'admin') and role <> 'owner' and user_id <> auth.uid())
  with check (auth_has_role(company_id, 'admin') and role <> 'owner' and user_id <> auth.uid());

-- 3. increment_usage is SECURITY DEFINER and was executable by anon: anyone
--    could exhaust a company's application allowance or mint live-AI
--    interview credits. Only the server (service role) calls it.
revoke execute on function increment_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function increment_usage(uuid, text, integer) to service_role;

-- 4. Recruiters could set jobs.status = 'published' directly, skipping the
--    plan check in /api/jobs/[id]/status. Publishing now only happens through
--    the server (service role) after that check.
create or replace function prevent_client_job_publish()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated')
     and new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    raise exception 'Jobs can only be published through the application' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_prevent_client_publish on jobs;
create trigger jobs_prevent_client_publish
  before insert or update of status on jobs
  for each row execute function prevent_client_job_publish();

-- 5. Storage limits, so the private buckets can't be filled with arbitrary
--    payloads even by server-side mistakes.
update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  where id = 'cvs';
update storage.buckets set file_size_limit = 262144000, allowed_mime_types = array['video/webm', 'video/mp4'] where id = 'videos';
