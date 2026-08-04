-- Atomic usage counter increments — spec Part K §22 "Use database
-- transactions or atomic RPC functions to avoid race conditions." Applies
-- to the company's current usage_period (the row whose period contains now()).
create or replace function increment_usage(p_company_id uuid, p_metric text, p_amount integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_metric not in ('active_jobs', 'applications', 'ai_screenings', 'assessment_invitations', 'video_interview_candidates', 'team_members') then
    raise exception 'Unknown usage metric: %', p_metric;
  end if;

  execute format(
    'update usage_periods set %I = %I + $1 where company_id = $2 and period_start <= now() and period_end >= now()',
    p_metric, p_metric
  ) using p_amount, p_company_id;
end;
$$;

-- Callable by authenticated users acting within their own company (enforced by
-- the p_company_id the caller passes combined with server-side session checks
-- in application code — this function itself is SECURITY DEFINER so it can
-- write past RLS, matching the "atomic RPC" pattern the spec calls for).
grant execute on function increment_usage(uuid, text, integer) to authenticated, service_role;
