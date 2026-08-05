import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id, daysFromNow } from "@/lib/data/ids";
import type { AddonProduct, CompanyAddon, Payment, Plan, PlanLimits, Subscription, SubscriptionEvent } from "@/types/database";

/**
 * Centralized plan-access service — owns what a company is *entitled to*:
 * the plan/add-on catalog, subscription lifecycle, owned add-ons, and
 * payment history. Consumption/limits-checking lives in usage-tracking.ts.
 *
 * Catalog and subscription reads go through the admin client rather than the
 * cookie-bound server client: they're called from unauthenticated
 * candidate-facing routes (application submission), authenticated dashboard
 * routes, and the Paystack webhook (no Supabase session at all) alike — RLS
 * (auth_company_ids()) has no session to scope against in the first and third
 * cases. listPayments is the one exception: only ever called with an owner
 * session, so it stays RLS-scoped for defense in depth on financial records.
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

export async function listAddonProducts(): Promise<AddonProduct[]> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("addon_products").select("*").eq("active", true);
    return (data as AddonProduct[]) ?? [];
  }
  return mockStore.addonProducts.filter((a) => a.active);
}

export async function getAddonProductBySku(sku: string): Promise<AddonProduct | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("addon_products").select("*").eq("sku", sku).eq("active", true).maybeSingle();
    return (data as AddonProduct | null) ?? null;
  }
  return mockStore.addonProducts.find((a) => a.sku === sku && a.active) ?? null;
}

export async function listCompanyAddons(companyId: string, status?: CompanyAddon["status"]): Promise<CompanyAddon[]> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    let query = admin.from("company_addons").select("*").eq("company_id", companyId);
    if (status) query = query.eq("status", status);
    const { data } = await query;
    return (data as CompanyAddon[]) ?? [];
  }
  return mockStore.companyAddons.filter((a) => a.company_id === companyId && (!status || a.status === status));
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

export async function getPlanForCompany(companyId: string): Promise<Plan | null> {
  const sub = await getSubscription(companyId);
  if (!sub) return null;
  return getPlan(sub.plan_id);
}

/** Job creation (and everything downstream of it) requires a real, paid-for plan — not just an account. */
export async function hasActiveSubscription(companyId: string): Promise<boolean> {
  const sub = await getSubscription(companyId);
  return !!sub && (sub.status === "active" || sub.status === "non_renewing");
}

export async function hasLiveAiInterviewerAccess(companyId: string): Promise<boolean> {
  const [sub, plan] = await Promise.all([getSubscription(companyId), getPlanForCompany(companyId)]);
  if (!sub || !plan) return false;
  if (sub.status !== "active" && sub.status !== "non_renewing") return false;
  return plan.features.includes("live_ai_interviewer");
}

/** Plan limit + active recurring add-ons of the same kind. Applications is left as the plan's base limit — grace and one-time application credits are period-sensitive and computed in usage-tracking.ts. */
export async function getEffectiveLimits(companyId: string): Promise<PlanLimits> {
  const plan = await getPlanForCompany(companyId);
  const base = plan?.limits ?? { active_jobs: 0, applications: 0, team_members: 0 };
  const recurringAddons = await listCompanyAddons(companyId, "active");

  const extraJobs = recurringAddons.filter((a) => a.billing_type === "recurring" && a.sku.startsWith("extra_jobs_")).reduce((sum, a) => sum + a.quantity, 0);
  const extraTeamMembers = recurringAddons.filter((a) => a.billing_type === "recurring" && a.sku.startsWith("extra_team_members_")).reduce((sum, a) => sum + a.quantity, 0);

  return {
    active_jobs: base.active_jobs + extraJobs,
    applications: base.applications,
    team_members: base.team_members + extraTeamMembers,
  };
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
      paystack_email_token: null, paystack_authorization_code: null, status: "pending", period_start: now, period_end: now, next_payment_date: null,
      cancel_at_period_end: false, grace_period_end: null, canceled_at: null, cancellation_reason: null, created_at: now, updated_at: now,
    };
    mockStore.subscriptions.push(subscription);
  }
  return subscription;
}

export async function activateSubscription(
  companyId: string,
  planId: string,
  paystackCustomerCode: string,
  paystackSubscriptionCode: string,
  paystackAuthorizationCode?: string,
): Promise<Subscription> {
  const { resetApplicationUsage } = await import("@/lib/services/usage-tracking");
  const now = new Date().toISOString();
  const periodEnd = daysFromNow(30);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: existing } = await admin.from("subscriptions").select("id").eq("company_id", companyId).maybeSingle();
    const fields: Record<string, unknown> = {
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
    if (paystackAuthorizationCode) fields.paystack_authorization_code = paystackAuthorizationCode;

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

    await resetApplicationUsage(companyId, subscription.id, now, periodEnd);
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
      paystack_authorization_code: paystackAuthorizationCode ?? null,
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
      paystack_authorization_code: paystackAuthorizationCode ?? subscription.paystack_authorization_code,
      status: "active",
      period_start: now,
      period_end: periodEnd,
      next_payment_date: periodEnd,
      cancel_at_period_end: false,
      grace_period_end: null,
      updated_at: now,
    });
  }

  await resetApplicationUsage(companyId, subscription.id, now, periodEnd);
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

export async function markPastDue(companyId: string, graceDays: number): Promise<Subscription | null> {
  const fields = { status: "attention", grace_period_end: daysFromNow(graceDays) };

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

/**
 * Fulfills a paid add-on purchase (webhook-triggered, source of truth).
 * Recurring add-ons of the same SKU merge into one active row (quantity
 * accumulates); one-time application packs expire with the current
 * subscription period; one-time live-AI packs top up the credit ledger.
 */
export async function fulfillAddonPurchase(companyId: string, addon: AddonProduct, paystackReference: string): Promise<CompanyAddon> {
  const now = new Date().toISOString();
  let periodEnd: string | null = null;
  if (addon.billing_type === "one_time" && addon.kind === "applications") {
    const sub = await getSubscription(companyId);
    periodEnd = sub?.period_end ?? daysFromNow(30);
  }

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    if (addon.billing_type === "recurring") {
      const { data: existing } = await admin.from("company_addons").select("*").eq("company_id", companyId).eq("sku", addon.sku).eq("status", "active").maybeSingle();
      if (existing) {
        const { data, error } = await admin.from("company_addons").update({ quantity: existing.quantity + addon.quantity, paystack_reference: paystackReference }).eq("id", existing.id).select("*").single();
        if (error) throw error;
        return data as CompanyAddon;
      }
    }

    const { data, error } = await admin
      .from("company_addons")
      .insert({ company_id: companyId, addon_product_id: addon.id, sku: addon.sku, quantity: addon.quantity, billing_type: addon.billing_type, status: "active", period_start: now, period_end: periodEnd, paystack_reference: paystackReference })
      .select("*")
      .single();
    if (error) throw error;

    if (addon.kind === "live_ai_interviews") {
      const { grantLiveAiInterviewCredits } = await import("@/lib/services/usage-tracking");
      await grantLiveAiInterviewCredits(companyId, addon.quantity);
    }

    return data as CompanyAddon;
  }

  if (addon.billing_type === "recurring") {
    const existing = mockStore.companyAddons.find((a) => a.company_id === companyId && a.sku === addon.sku && a.status === "active");
    if (existing) {
      existing.quantity += addon.quantity;
      existing.paystack_reference = paystackReference;
      return existing;
    }
  }

  const record: CompanyAddon = {
    id: id(), company_id: companyId, addon_product_id: addon.id, sku: addon.sku, quantity: addon.quantity,
    billing_type: addon.billing_type, status: "active", period_start: now, period_end: periodEnd,
    paystack_reference: paystackReference, created_at: now,
  };
  mockStore.companyAddons.push(record);

  if (addon.kind === "live_ai_interviews") {
    const { grantLiveAiInterviewCredits } = await import("@/lib/services/usage-tracking");
    await grantLiveAiInterviewCredits(companyId, addon.quantity);
  }

  return record;
}

export async function cancelCompanyAddon(addonId: string): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("company_addons").update({ status: "canceled" }).eq("id", addonId);
    return;
  }
  const addon = mockStore.companyAddons.find((a) => a.id === addonId);
  if (addon) addon.status = "canceled";
}

export async function recordPayment(input: {
  companyId: string;
  subscriptionId: string | null;
  paystackReference: string;
  paystackTransactionId: string | null;
  amount: number;
  currency: string;
  status: Payment["status"];
  paidAt: string | null;
  metadata: Record<string, unknown>;
}): Promise<Payment> {
  const fields = {
    company_id: input.companyId,
    subscription_id: input.subscriptionId,
    paystack_reference: input.paystackReference,
    paystack_transaction_id: input.paystackTransactionId,
    amount: input.amount,
    currency: input.currency,
    status: input.status,
    paid_at: input.paidAt,
    metadata: input.metadata,
  };

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    // Paystack may redeliver the same charge.success event's underlying transaction; the
    // reference is unique, so this stays idempotent even outside the webhook's own event-key guard.
    const { data, error } = await admin.from("payments").upsert(fields, { onConflict: "paystack_reference" }).select("*").single();
    if (error) throw error;
    return data as Payment;
  }

  const existing = mockStore.payments.find((p) => p.paystack_reference === input.paystackReference);
  if (existing) {
    Object.assign(existing, fields);
    return existing;
  }
  const payment: Payment = { id: id(), ...fields };
  mockStore.payments.push(payment);
  return payment;
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
