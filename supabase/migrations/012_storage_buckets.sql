-- Private storage buckets — spec Part Q "Private CV and video buckets" +
-- "Time-limited signed URLs". Bucket names match SUPABASE_CV_BUCKET /
-- SUPABASE_VIDEO_BUCKET / SUPABASE_LOGO_BUCKET in .env.example.

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false), ('videos', 'videos', false), ('company-logos', 'company-logos', true)
on conflict (id) do update set public = excluded.public;

-- CVs and videos: only readable by members of the owning company, via the
-- `company_id` prefix convention (e.g. `cvs/<company_id>/<application_id>.pdf`).
-- All writes happen through the service-role client (signed upload URLs), so
-- no insert policy is needed for authenticated/anon roles.

create policy cvs_select_company_member on storage.objects for select
  using (bucket_id = 'cvs' and (storage.foldername(name))[1]::uuid in (select auth_company_ids()));

create policy videos_select_company_member on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1]::uuid in (select auth_company_ids()));

-- Company logos are public read (they're displayed on public career pages).
create policy company_logos_select_public on storage.objects for select
  using (bucket_id = 'company-logos');
