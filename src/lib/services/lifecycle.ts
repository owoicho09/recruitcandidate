import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import type { LifecycleSegment, LifecycleEventType, LifecycleEvent, Company, CompanyMember } from "@/types/database";

export const LIFECYCLE_SEGMENTS: LifecycleSegment[] = [
  "signup_incomplete_setup",
  "setup_complete_no_job",
  "draft_not_subscribed",
  "subscribed_not_published",
  "published_no_applications",
  "receiving_applications",
  "at_plan_limit",
];

export interface LifecycleFacts {
  hasCompanyProfile: boolean;
  hasDraftJob: boolean;
  hasPublishedJob: boolean;
  hasActiveSubscription: boolean;
  applicationsCount: number;
  atPlanLimit: boolean;
}

/**
 * Precedence runs most-advanced-state-first: each check assumes everything
 * below it is also true (a company with applications necessarily has a
 * published job, which necessarily was subscribed to get there), so the
 * first match wins rather than needing every segment's full condition list.
 */
export function computeLifecycleSegment(facts: LifecycleFacts): LifecycleSegment {
  if (facts.atPlanLimit) return "at_plan_limit";
  if (facts.applicationsCount > 0) return "receiving_applications";
  if (facts.hasPublishedJob) return "published_no_applications";
  if (facts.hasActiveSubscription) return "subscribed_not_published";
  if (facts.hasDraftJob) return "draft_not_subscribed";
  if (facts.hasCompanyProfile) return "setup_complete_no_job";
  return "signup_incomplete_setup";
}

export function isCompanyProfileComplete(company: Pick<Company, "description" | "industry" | "size" | "country" | "city">): boolean {
  return Boolean(company.description && company.industry && company.size && company.country && company.city);
}

async function gatherFacts(companyId: string): Promise<LifecycleFacts> {
  const { getCompany } = await import("@/lib/services/companies");
  const { listJobs } = await import("@/lib/services/jobs");
  const { hasActiveSubscription } = await import("@/lib/services/plan-access");
  const { checkUsage } = await import("@/lib/services/usage-tracking");

  const [company, jobs, activeSubscription, applicationsUsage] = await Promise.all([
    getCompany(companyId),
    listJobs(companyId),
    hasActiveSubscription(companyId),
    checkUsage(companyId, "applications"),
  ]);

  return {
    hasCompanyProfile: company ? isCompanyProfileComplete(company) : false,
    hasDraftJob: jobs.some((j) => j.status === "draft"),
    hasPublishedJob: jobs.some((j) => j.status === "published"),
    hasActiveSubscription: activeSubscription,
    applicationsCount: applicationsUsage.used,
    atPlanLimit: !applicationsUsage.allowed && applicationsUsage.limit > 0,
  };
}

/**
 * Recomputes and persists the company's segment from current DB state. On a
 * genuine change, also cancels whatever follow-up sequence was pending for
 * the old segment and queues the new one — this is the single place that
 * decision has to happen, rather than every event call site remembering to.
 */
export async function recomputeLifecycleSegment(companyId: string): Promise<{ previous: LifecycleSegment; current: LifecycleSegment } | null> {
  const facts = await gatherFacts(companyId);
  const nextSegment = computeLifecycleSegment(facts);
  let changed: { previous: LifecycleSegment; current: LifecycleSegment } | null = null;

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from("companies").select("lifecycle_segment").eq("id", companyId).maybeSingle();
    const previous = (existing?.lifecycle_segment as LifecycleSegment | undefined) ?? "signup_incomplete_setup";
    if (previous !== nextSegment) {
      await admin.from("companies").update({ lifecycle_segment: nextSegment, lifecycle_segment_updated_at: new Date().toISOString() }).eq("id", companyId);
      changed = { previous, current: nextSegment };
    }
  } else {
    const company = mockStore.companies.find((c) => c.id === companyId);
    if (company && company.lifecycle_segment !== nextSegment) {
      changed = { previous: company.lifecycle_segment, current: nextSegment };
      company.lifecycle_segment = nextSegment;
      company.lifecycle_segment_updated_at = new Date().toISOString();
    }
  }

  if (changed) {
    const { cancelPendingLifecycleEmails, scheduleLifecycleFollowUps } = await import("@/lib/services/lifecycle-email");
    await cancelPendingLifecycleEmails(companyId);
    await scheduleLifecycleFollowUps(companyId, nextSegment);
  }

  return changed;
}

async function recordLifecycleEvent(companyId: string, eventType: LifecycleEventType, userId?: string | null, metadata: Record<string, unknown> = {}): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("lifecycle_events").insert({ company_id: companyId, user_id: userId ?? null, event_type: eventType, metadata });
    return;
  }

  const event: LifecycleEvent = { id: id(), company_id: companyId, user_id: userId ?? null, event_type: eventType, metadata, created_at: new Date().toISOString() };
  mockStore.lifecycleEvents.push(event);
}

/**
 * The one function most call sites need: log the discrete event that just
 * happened, then recompute the company's segment from fresh state. Best-effort
 * — a lifecycle-tracking failure should never break the action that triggered it.
 */
export async function trackLifecycleEvent(companyId: string, eventType: LifecycleEventType, userId?: string | null, metadata?: Record<string, unknown>): Promise<void> {
  try {
    await recordLifecycleEvent(companyId, eventType, userId, metadata);
    await recomputeLifecycleSegment(companyId);
  } catch (err) {
    console.error(`Lifecycle tracking failed (${eventType}):`, err instanceof Error ? err.message : err);
  }
}

/**
 * Company profile fields are edited from two different routes (Settings,
 * Career Page), so the "did this field just become set" detection lives
 * here rather than being duplicated in each caller — pass the row as it was
 * immediately before the update and as it is immediately after.
 */
export async function trackCompanyProfileUpdate(companyId: string, userId: string | null, before: Company | null, after: Company): Promise<void> {
  try {
    if (before && !isCompanyProfileComplete(before) && isCompanyProfileComplete(after)) {
      await recordLifecycleEvent(companyId, "company_profile_completed", userId);
    }
    if (after.logo_url && !before?.logo_url) {
      await recordLifecycleEvent(companyId, "logo_uploaded", userId);
    }
    await recomputeLifecycleSegment(companyId);
  } catch (err) {
    console.error("Lifecycle tracking failed (company profile update):", err instanceof Error ? err.message : err);
  }
}

export async function listLifecycleEvents(companyId: string, limit = 50): Promise<LifecycleEvent[]> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("lifecycle_events").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(limit);
    return (data as LifecycleEvent[] | null) ?? [];
  }
  return mockStore.lifecycleEvents
    .filter((e) => e.company_id === companyId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit);
}

export interface LifecycleCompanyRow {
  company: Company;
  owner: CompanyMember | null;
}

/** Platform-admin listing, optionally filtered to one segment. */
export async function listCompaniesForLifecycleAdmin(segment?: LifecycleSegment): Promise<LifecycleCompanyRow[]> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    let query = admin.from("companies").select("*").order("lifecycle_segment_updated_at", { ascending: false });
    if (segment) query = query.eq("lifecycle_segment", segment);
    const { data: companiesData } = await query;
    if (!companiesData || companiesData.length === 0) return [];
    const companies = companiesData as Company[];

    const { data: owners } = await admin.from("company_members").select("*").in("company_id", companies.map((c) => c.id)).eq("role", "owner");
    return companies.map((company) => ({ company, owner: (owners as CompanyMember[] | null)?.find((o) => o.company_id === company.id) ?? null }));
  }

  const companies = segment ? mockStore.companies.filter((c) => c.lifecycle_segment === segment) : mockStore.companies;
  return companies.map((company) => ({ company, owner: mockStore.companyMembers.find((m) => m.company_id === company.id && m.role === "owner") ?? null }));
}

export interface LifecycleFunnelStage {
  eventType: LifecycleEventType;
  label: string;
  companies: number;
  pctOfPrevious: number | null;
  pctOfTotal: number;
}

const FUNNEL_STAGES: { eventType: LifecycleEventType; label: string }[] = [
  { eventType: "account_created", label: "Signup" },
  { eventType: "company_profile_completed", label: "Company setup" },
  { eventType: "first_draft_job_created", label: "Draft job" },
  { eventType: "subscription_activated", label: "Subscription" },
  { eventType: "first_job_published", label: "Published job" },
  { eventType: "first_application_received", label: "First application" },
];

/** Distinct companies that ever reached each milestone — a true funnel (current state doesn't matter, only whether they got there once). */
export async function getLifecycleFunnel(): Promise<LifecycleFunnelStage[]> {
  let counts: number[];

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    counts = await Promise.all(
      FUNNEL_STAGES.map(async ({ eventType }) => {
        const { data } = await admin.from("lifecycle_events").select("company_id").eq("event_type", eventType);
        return new Set((data ?? []).map((r) => r.company_id as string)).size;
      }),
    );
  } else {
    counts = FUNNEL_STAGES.map(
      ({ eventType }) => new Set(mockStore.lifecycleEvents.filter((e) => e.event_type === eventType).map((e) => e.company_id)).size,
    );
  }

  const total = counts[0] || 1;
  return FUNNEL_STAGES.map(({ eventType, label }, i) => ({
    eventType,
    label,
    companies: counts[i],
    pctOfPrevious: i === 0 ? null : counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 0,
    pctOfTotal: Math.round((counts[i] / total) * 100),
  }));
}
