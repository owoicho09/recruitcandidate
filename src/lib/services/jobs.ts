import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import { slugify } from "@/lib/utils/slug";
import { getCompanyBySlug } from "@/lib/services/companies";
import type { Job } from "@/types/database";

export async function listJobs(companyId: string): Promise<Job[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("jobs").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data as Job[];
  }
  return mockStore.jobs
    .filter((j) => j.company_id === companyId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function getJob(companyId: string, jobId: string): Promise<Job | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("jobs").select("*").eq("company_id", companyId).eq("id", jobId).maybeSingle();
    return (data as Job | null) ?? null;
  }
  return mockStore.jobs.find((j) => j.company_id === companyId && j.id === jobId) ?? null;
}

export async function getJobBySlug(companySlug: string, jobSlug: string): Promise<{ job: Job; companyId: string } | null> {
  const company = await getCompanyBySlug(companySlug);
  if (!company) return null;

  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("company_id", company.id)
      .eq("slug", jobSlug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    return { job: data as Job, companyId: company.id };
  }

  const job = mockStore.jobs.find((j) => j.company_id === company.id && j.slug === jobSlug && j.status === "published");
  if (!job) return null;
  return { job, companyId: company.id };
}

export async function listPublishedJobsForCompany(companySlug: string) {
  const company = await getCompanyBySlug(companySlug);
  if (!company) return { company: null, jobs: [] as Job[] };

  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("jobs").select("*").eq("company_id", company.id).eq("status", "published");
    return { company, jobs: (data as Job[] | null) ?? [] };
  }

  const jobs = mockStore.jobs.filter((j) => j.company_id === company.id && j.status === "published");
  return { company, jobs };
}

export interface JobInput
  extends Omit<Job, "id" | "company_id" | "created_by" | "slug" | "status" | "published_at" | "created_at" | "updated_at"> {
  slug?: string;
}

export async function createJob(companyId: string, createdBy: string, input: JobInput): Promise<Job> {
  const slug = input.slug || slugify(input.title);

  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...input, slug, company_id: companyId, created_by: createdBy, status: "draft", published_at: null })
      .select("*")
      .single();
    if (error) throw error;
    return data as Job;
  }

  const now = new Date().toISOString();
  const job: Job = {
    ...input,
    id: id(),
    company_id: companyId,
    created_by: createdBy,
    slug,
    status: "draft",
    published_at: null,
    created_at: now,
    updated_at: now,
  };
  mockStore.jobs.unshift(job);
  return job;
}

export async function updateJob(companyId: string, jobId: string, patch: Partial<Job>): Promise<Job | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("jobs").update(patch).eq("company_id", companyId).eq("id", jobId).select("*").maybeSingle();
    return (data as Job | null) ?? null;
  }

  const job = mockStore.jobs.find((j) => j.company_id === companyId && j.id === jobId);
  if (!job) return null;
  Object.assign(job, patch, { updated_at: new Date().toISOString() });
  return job;
}

/**
 * Service-role write, scoped by companyId: callers authorize at the route
 * layer (dashboard session + plan check, or the signed Paystack webhook after
 * payment — which has no user session for RLS to scope against). Direct
 * client-side publishes are blocked in the database (migration 018).
 */
export async function setJobStatus(companyId: string, jobId: string, status: Job["status"]): Promise<Job | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from("jobs").select("published_at").eq("company_id", companyId).eq("id", jobId).maybeSingle();
    if (!existing) return null;
    const patch: Partial<Job> = { status, updated_at: new Date().toISOString() };
    if (status === "published" && !existing.published_at) patch.published_at = patch.updated_at;
    const { data } = await admin.from("jobs").update(patch).eq("company_id", companyId).eq("id", jobId).select("*").maybeSingle();
    return (data as Job | null) ?? null;
  }

  const job = mockStore.jobs.find((j) => j.company_id === companyId && j.id === jobId);
  if (!job) return null;
  job.status = status;
  job.updated_at = new Date().toISOString();
  if (status === "published" && !job.published_at) job.published_at = job.updated_at;
  return job;
}

export async function duplicateJob(companyId: string, jobId: string, createdBy: string): Promise<Job | null> {
  const source = await getJob(companyId, jobId);
  if (!source) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, company_id: _companyId, created_by: _createdBy, slug: _slug, status: _status, published_at: _publishedAt, created_at: _createdAt, updated_at: _updatedAt, ...rest } = source;
  const copy: JobInput = {
    ...rest,
    slug: `${source.slug}-copy-${Math.floor(Math.random() * 1000)}`,
    title: `${source.title} (Copy)`,
  };
  return createJob(companyId, createdBy, copy);
}

export async function countActiveJobs(companyId: string): Promise<number> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { count } = await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "published");
    return count ?? 0;
  }
  return mockStore.jobs.filter((j) => j.company_id === companyId && j.status === "published").length;
}
