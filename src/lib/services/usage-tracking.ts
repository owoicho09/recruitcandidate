import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import { countActiveJobs } from "@/lib/services/jobs";
import { countActiveTeamMembers } from "@/lib/services/team";
import { getPlanForCompany, getSubscription, getEffectiveLimits, listCompanyAddons } from "@/lib/services/plan-access";
import type { UsagePeriod } from "@/types/database";

/**
 * Centralized usage-tracking service — owns *consumption* against whatever
 * plan-access says a company is entitled to. active_jobs/team_members are
 * live counts (removing a job/member frees capacity immediately); applications
 * is the one real period counter, incremented once per submitted application
 * (spec: CV screening, assessment, video interview, and pipeline movement all
 * ride the same allowance — they are not metered separately). A 5% grace
 * allowance and any purchased one-time application credits apply only here,
 * to the applications metric.
 */
const APPLICATION_GRACE_MULTIPLIER = 1.05;

export type UsageMetric = "active_jobs" | "applications" | "team_members";

export interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number;
  reason?: string;
}

export async function getCurrentUsage(companyId: string): Promise<UsagePeriod | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("usage_periods").select("*").eq("company_id", companyId).maybeSingle();
    return (data as UsagePeriod | null) ?? null;
  }
  return mockStore.usagePeriods.find((u) => u.company_id === companyId) ?? null;
}

/** Sum of active, currently-valid one-time application credit packs. */
async function getPurchasedApplicationCredits(companyId: string): Promise<number> {
  const addons = await listCompanyAddons(companyId, "active");
  const now = Date.now();
  return addons
    .filter((a) => a.billing_type === "one_time" && a.sku.startsWith("extra_applications_") && (!a.period_end || new Date(a.period_end).getTime() >= now))
    .reduce((sum, a) => sum + a.quantity, 0);
}

export async function checkUsage(companyId: string, metric: UsageMetric): Promise<UsageCheck> {
  const [subscription, plan] = await Promise.all([getSubscription(companyId), getPlanForCompany(companyId)]);
  if (!subscription || !plan) return { allowed: false, used: 0, limit: 0, reason: "No active subscription" };
  if (subscription.status !== "active" && subscription.status !== "non_renewing") {
    return { allowed: false, used: 0, limit: 0, reason: "Subscription is not active" };
  }

  const effective = await getEffectiveLimits(companyId);

  if (metric === "active_jobs") {
    const used = await countActiveJobs(companyId);
    return { allowed: used < effective.active_jobs, used, limit: effective.active_jobs, reason: used >= effective.active_jobs ? "Plan limit reached" : undefined };
  }

  if (metric === "team_members") {
    const used = await countActiveTeamMembers(companyId);
    return { allowed: used < effective.team_members, used, limit: effective.team_members, reason: used >= effective.team_members ? "Plan limit reached" : undefined };
  }

  // applications: base limit + 5% grace + purchased one-time credits
  const usage = await getCurrentUsage(companyId);
  const used = usage?.applications ?? 0;
  const credits = await getPurchasedApplicationCredits(companyId);
  const limit = Math.floor(effective.applications * APPLICATION_GRACE_MULTIPLIER) + credits;
  return { allowed: used < limit, used, limit, reason: used >= limit ? "Plan limit reached" : undefined };
}

export interface UsageMetricStatus extends UsageCheck {
  pct: number;
  level: "ok" | "warning_80" | "warning_95" | "exhausted";
}

function levelFor(pct: number): UsageMetricStatus["level"] {
  if (pct >= 100) return "exhausted";
  if (pct >= 95) return "warning_95";
  if (pct >= 80) return "warning_80";
  return "ok";
}

export interface UsageSummary {
  activeJobs: UsageMetricStatus;
  applications: UsageMetricStatus;
  teamMembers: UsageMetricStatus;
  liveAiInterviewCredits: number;
}

export async function getUsageSummary(companyId: string): Promise<UsageSummary> {
  const [activeJobs, applications, teamMembers, usage] = await Promise.all([
    checkUsage(companyId, "active_jobs"),
    checkUsage(companyId, "applications"),
    checkUsage(companyId, "team_members"),
    getCurrentUsage(companyId),
  ]);

  const withLevel = (c: UsageCheck): UsageMetricStatus => {
    const pct = c.limit > 0 ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0;
    return { ...c, pct, level: levelFor(pct) };
  };

  return {
    activeJobs: withLevel(activeJobs),
    applications: withLevel(applications),
    teamMembers: withLevel(teamMembers),
    liveAiInterviewCredits: usage?.live_ai_interview_credits ?? 0,
  };
}

/** The one place "applications" usage is incremented — spec: one allowance unit per submitted application, covering every downstream stage (screening, assessment, video interview, transcription, pipeline movement, email). */
export async function recordApplicationSubmitted(companyId: string): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.rpc("increment_usage", { p_company_id: companyId, p_metric: "applications" });
    return;
  }
  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (usage) usage.applications += 1;
}

/**
 * Resets the period counter on subscription activation/renewal. Deliberately
 * does not touch live_ai_interview_credits — those are a persistent balance,
 * not a period allowance (application credits expire at period end; AI
 * interview credits don't, per spec).
 */
export async function resetApplicationUsage(companyId: string, subscriptionId: string, periodStart: string, periodEnd: string): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from("usage_periods").select("id").eq("company_id", companyId).maybeSingle();
    if (existing) {
      await admin.from("usage_periods").update({ period_start: periodStart, period_end: periodEnd, applications: 0 }).eq("id", existing.id);
    } else {
      await admin.from("usage_periods").insert({ company_id: companyId, subscription_id: subscriptionId, period_start: periodStart, period_end: periodEnd });
    }
    return;
  }

  let usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (!usage) {
    usage = { id: id(), company_id: companyId, subscription_id: subscriptionId, period_start: periodStart, period_end: periodEnd, applications: 0, live_ai_interview_credits: 0, storage_bytes: 0 };
    mockStore.usagePeriods.push(usage);
  } else {
    Object.assign(usage, { period_start: periodStart, period_end: periodEnd, applications: 0 });
  }
}

export async function getLiveAiInterviewCreditBalance(companyId: string): Promise<number> {
  const usage = await getCurrentUsage(companyId);
  return usage?.live_ai_interview_credits ?? 0;
}

export async function grantLiveAiInterviewCredits(companyId: string, quantity: number): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.rpc("increment_usage", { p_company_id: companyId, p_metric: "live_ai_interview_credits", p_amount: quantity });
    return;
  }
  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (usage) usage.live_ai_interview_credits += quantity;
}

/** Stub for the not-yet-built live-interview feature — decrements the credit ledger, never goes negative. */
export async function consumeLiveAiInterviewCredit(companyId: string): Promise<boolean> {
  const balance = await getLiveAiInterviewCreditBalance(companyId);
  if (balance <= 0) return false;

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.rpc("increment_usage", { p_company_id: companyId, p_metric: "live_ai_interview_credits", p_amount: -1 });
    return true;
  }
  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (usage) usage.live_ai_interview_credits -= 1;
  return true;
}
