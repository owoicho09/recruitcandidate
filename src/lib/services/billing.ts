import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id, daysFromNow } from "@/lib/data/ids";
import { env } from "@/lib/env";
import type { Payment, Plan, PlanLimits, Subscription, SubscriptionEvent, UsagePeriod } from "@/types/database";

/**
 * Plans/subscription/usage reads go through the admin client rather than the
 * cookie-bound server client: checkUsage() (built on top of these) is called
 * from unauthenticated candidate-facing routes (e.g. public application
 * submission) as well as authenticated dashboard/webhook contexts, and RLS
 * (auth_company_ids()) has no session to scope against in the unauthenticated
 * case — it would silently return no rows rather than erroring, which reads
 * as "limit reached" instead of "not applicable here". listPayments is the
 * one exception below: it's only ever called with an owner session, so it
 * stays RLS-scoped for defense in depth on financial records.
 */
export async function listPlans(): Promise<Plan[]> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("plans").select("*").eq("active", true);
    return (data as Plan[]) ?? [];
  }
  return mockStore.plans.filter((p) => p.active);
}

export async function getPlan(planId: string): Promise<Plan | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("plans").select("*").eq("id", planId).maybeSingle();
    return (data as Plan | null) ?? null;
  }
  return mockStore.plans.find((p) => p.id === planId) ?? null;
}

export async function listPayments(companyId: string): Promise<Payment[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("payments").select("*").eq("company_id", companyId).order("paid_at", { ascending: false, nullsFirst: false });
    return (data as Payment[]) ?? [];
  }
  return mockStore.payments.filter((p) => p.company_id === companyId).sort((a, b) => +new Date(b.paid_at ?? 0) - +new Date(a.paid_at ?? 0));
}

export async function getSubscription(companyId: string): Promise<Subscription | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("subscriptions").select("*").eq("company_id", companyId).maybeSingle();
    return (data as Subscription | null) ?? null;
  }
  return mockStore.subscriptions.find((s) => s.company_id === companyId) ?? null;
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

export async function getPlanForCompany(companyId: string): Promise<Plan | null> {
  const sub = await getSubscription(companyId);
  if (!sub) return null;
  return getPlan(sub.plan_id);
}

export interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number;
  reason?: string;
}

/** Spec Part K §22 "Usage Enforcement" — call before every metered action. */
export async function checkUsage(companyId: string, metric: keyof PlanLimits): Promise<UsageCheck> {
  const plan = await getPlanForCompany(companyId);
  const usage = await getCurrentUsage(companyId);
  const subscription = await getSubscription(companyId);

  if (!plan || !usage || !subscription) return { allowed: false, used: 0, limit: 0, reason: "No active subscription" };
  if (subscription.status !== "active" && subscription.status !== "non_renewing") {
    return { allowed: false, used: 0, limit: plan.limits[metric], reason: "Subscription is not active" };
  }

  const usageKeyMap: Record<keyof PlanLimits, keyof UsagePeriod> = {
    active_jobs: "active_jobs",
    applications: "applications",
    ai_screenings: "ai_screenings",
    assessment_invitations: "assessment_invitations",
    video_interview_candidates: "video_interview_candidates",
    team_members: "team_members",
  };

  const used = usage[usageKeyMap[metric]] as number;
  const limit = plan.limits[metric];
  return { allowed: used < limit, used, limit, reason: used >= limit ? "Plan limit reached" : undefined };
}

/**
 * Every write below goes through the admin client rather than the cookie-bound
 * server client: these are called both from an owner's dashboard session
 * (already authorized via requireSession("owner")) and from the unauthenticated
 * Paystack webhook (authorized via HMAC signature instead) — no single RLS
 * policy covers both callers, so authorization is enforced at the route layer.
 */
export async function startCheckout(companyId: string, planId: string): Promise<Subscription> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from("subscriptions").select("id").eq("company_id", companyId).maybeSingle();

    if (existing) {
      const { data, error } = await admin.from("subscriptions").update({ plan_id: planId }).eq("id", existing.id).select("*").single();
      if (error) throw error;
      return data as Subscription;
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("subscriptions")
      .insert({ company_id: companyId, plan_id: planId, status: "pending", period_start: now, period_end: now })
      .select("*")
      .single();
    if (error) throw error;
    return data as Subscription;
  }

  let subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (subscription) {
    subscription.plan_id = planId;
  } else {
    const now = new Date().toISOString();
    subscription = {
      id: id(), company_id: companyId, plan_id: planId, paystack_customer_code: null, paystack_subscription_code: null,
      paystack_email_token: null, status: "pending", period_start: now, period_end: now, next_payment_date: null,
      cancel_at_period_end: false, grace_period_end: null, canceled_at: null, cancellation_reason: null, created_at: now, updated_at: now,
    };
    mockStore.subscriptions.push(subscription);
  }
  return subscription;
}

export async function activateSubscription(companyId: string, planId: string, paystackCustomerCode: string, paystackSubscriptionCode: string): Promise<Subscription> {
  const now = new Date().toISOString();
  const periodEnd = daysFromNow(30);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: existing } = await admin.from("subscriptions").select("id").eq("company_id", companyId).maybeSingle();
    const fields = {
      plan_id: planId,
      paystack_customer_code: paystackCustomerCode,
      paystack_subscription_code: paystackSubscriptionCode,
      status: "active",
      period_start: now,
      period_end: periodEnd,
      next_payment_date: periodEnd,
      cancel_at_period_end: false,
      grace_period_end: null,
    };

    let subscription: Subscription;
    if (existing) {
      const { data, error } = await admin.from("subscriptions").update(fields).eq("id", existing.id).select("*").single();
      if (error) throw error;
      subscription = data as Subscription;
    } else {
      const { data, error } = await admin.from("subscriptions").insert({ company_id: companyId, ...fields }).select("*").single();
      if (error) throw error;
      subscription = data as Subscription;
    }

    const { data: existingUsage } = await admin.from("usage_periods").select("id").eq("company_id", companyId).maybeSingle();
    if (existingUsage) {
      await admin.from("usage_periods").update({ period_start: now, period_end: periodEnd, applications: 0, ai_screenings: 0, assessment_invitations: 0, video_interview_candidates: 0 }).eq("id", existingUsage.id);
    } else {
      await admin.from("usage_periods").insert({ company_id: companyId, subscription_id: subscription.id, period_start: now, period_end: periodEnd, team_members: 1 });
    }

    return subscription;
  }

  let subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) {
    subscription = {
      id: id(),
      company_id: companyId,
      plan_id: planId,
      paystack_customer_code: paystackCustomerCode,
      paystack_subscription_code: paystackSubscriptionCode,
      paystack_email_token: null,
      status: "active",
      period_start: now,
      period_end: periodEnd,
      next_payment_date: periodEnd,
      cancel_at_period_end: false,
      grace_period_end: null,
      canceled_at: null,
      cancellation_reason: null,
      created_at: now,
      updated_at: now,
    };
    mockStore.subscriptions.push(subscription);
  } else {
    Object.assign(subscription, {
      plan_id: planId,
      paystack_customer_code: paystackCustomerCode,
      paystack_subscription_code: paystackSubscriptionCode,
      status: "active",
      period_start: now,
      period_end: periodEnd,
      next_payment_date: periodEnd,
      cancel_at_period_end: false,
      grace_period_end: null,
      updated_at: now,
    });
  }

  let usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (!usage) {
    usage = { id: id(), company_id: companyId, subscription_id: subscription.id, period_start: now, period_end: periodEnd, active_jobs: 0, applications: 0, ai_screenings: 0, assessment_invitations: 0, video_interview_candidates: 0, team_members: 1, storage_bytes: 0 };
    mockStore.usagePeriods.push(usage);
  } else {
    Object.assign(usage, { period_start: now, period_end: periodEnd, applications: 0, ai_screenings: 0, assessment_invitations: 0, video_interview_candidates: 0 });
  }

  return subscription;
}

export async function cancelSubscription(companyId: string, reason: string): Promise<Subscription | null> {
  const fields = { cancel_at_period_end: true, status: "non_renewing", canceled_at: new Date().toISOString(), cancellation_reason: reason };

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("subscriptions").update(fields).eq("company_id", companyId).select("*").maybeSingle();
    if (error) throw error;
    return (data as Subscription | null) ?? null;
  }

  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) return null;
  Object.assign(subscription, fields);
  return subscription;
}

export async function reactivateSubscription(companyId: string): Promise<Subscription | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from("subscriptions").select("status").eq("company_id", companyId).maybeSingle();
    if (!existing) return null;
    const status = existing.status === "non_renewing" || existing.status === "canceled" ? "active" : existing.status;
    const { data, error } = await admin
      .from("subscriptions")
      .update({ cancel_at_period_end: false, canceled_at: null, cancellation_reason: null, status })
      .eq("company_id", companyId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Subscription;
  }

  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) return null;
  subscription.cancel_at_period_end = false;
  subscription.canceled_at = null;
  subscription.cancellation_reason = null;
  if (subscription.status === "non_renewing" || subscription.status === "canceled") subscription.status = "active";
  return subscription;
}

export async function markPastDue(companyId: string): Promise<Subscription | null> {
  const fields = { status: "attention", grace_period_end: daysFromNow(env.PAYMENT_GRACE_PERIOD_DAYS) };

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("subscriptions").update(fields).eq("company_id", companyId).select("*").maybeSingle();
    if (error) throw error;
    return (data as Subscription | null) ?? null;
  }

  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) return null;
  Object.assign(subscription, fields);
  return subscription;
}

export async function setSubscriptionCancelAtPeriodEnd(companyId: string, value: boolean): Promise<Subscription | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("subscriptions").update({ cancel_at_period_end: value }).eq("company_id", companyId).select("*").maybeSingle();
    if (error) throw error;
    return (data as Subscription | null) ?? null;
  }

  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) return null;
  subscription.cancel_at_period_end = value;
  return subscription;
}

export async function setSubscriptionPlan(companyId: string, planId: string): Promise<Subscription | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("subscriptions").update({ plan_id: planId }).eq("company_id", companyId).select("*").maybeSingle();
    if (error) throw error;
    return (data as Subscription | null) ?? null;
  }

  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) return null;
  subscription.plan_id = planId;
  return subscription;
}

export async function setSubscriptionStatus(companyId: string, status: Subscription["status"]): Promise<Subscription | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("subscriptions").update({ status }).eq("company_id", companyId).select("*").maybeSingle();
    if (error) throw error;
    return (data as Subscription | null) ?? null;
  }

  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) return null;
  subscription.status = status;
  return subscription;
}

/** Idempotency guard for the Paystack webhook — see spec Part K §23 "Webhook Security". */
export async function hasProcessedEvent(eventKey: string): Promise<boolean> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("subscription_events").select("id").eq("event_key", eventKey).maybeSingle();
    return !!data;
  }
  return mockStore.subscriptionEvents.some((e) => e.event_key === eventKey);
}

export async function recordSubscriptionEvent(record: Omit<SubscriptionEvent, "id">): Promise<SubscriptionEvent> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("subscription_events").insert(record).select("*").single();
    if (error) throw error;
    return data as SubscriptionEvent;
  }

  const event: SubscriptionEvent = { id: id(), ...record };
  mockStore.subscriptionEvents.push(event);
  return event;
}

export async function markEventFailed(eventId: string, error: string): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("subscription_events").update({ processing_status: "failed", error }).eq("id", eventId);
    return;
  }

  const event = mockStore.subscriptionEvents.find((e) => e.id === eventId);
  if (event) {
    event.processing_status = "failed";
    event.error = error;
  }
}

export async function getCompanyOwnerEmail(companyId: string): Promise<string | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("company_members").select("email").eq("company_id", companyId).eq("role", "owner").maybeSingle();
    return data?.email ?? null;
  }
  const owner = mockStore.companyMembers.find((m) => m.company_id === companyId && m.role === "owner");
  return owner?.email ?? null;
}
