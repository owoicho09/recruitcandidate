-- Public career pages and job listings are the one deliberate exception to
-- "members only" RLS: anyone (anon or authenticated) may read a company's
-- public profile once its career page is published, and that company's
-- published jobs. No candidate/application data is exposed by these policies.

create policy companies_select_public_career_page on companies for select
  using (career_page_status = 'published');

create policy jobs_select_public_published on jobs for select
  using (status = 'published');
