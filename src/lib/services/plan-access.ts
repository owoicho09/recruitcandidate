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

/**
 * Paystack's renewal charge can land a little after period_end — don't cut off
 * a paying customer in that window. Past it, a renewal that never arrived means
 * the subscription has lapsed.
 */
const RENEWAL_GRACE_MS = 2 * 86400000;

/**
 * Nothing else moves a subscription out of "active" once its period ends
 * without a renewal (e.g. Paystack never fired subscription.disable, or the
 * plan was granted without a Paystack subscription at all), so lapsed rows are
 * expired here: active → past_due, non_renewing → canceled, and "attention"
 * rows whose payment grace period has run out → past_due. Called on every
 * subscription read, and across all companies from platform-admin views.
 */
export async function expireLapsedSubscriptions(companyId?: string): Promise<void> {
  const cutoff = new Date(Date.now() - RENEWAL_GRACE_MS).toISOString();
  const now = new Date().toISOString();

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const expire = (fromStatus: Subscription["status"], toStatus: Subscription["status"], column: "period_end" | "grace_period_end", before: string) => {
      let query = admin.from("subscriptions").update({ status: toStatus }).eq("status", fromStatus).lt(column, before);
      if (companyId) query = query.eq("company_id", companyId);
      return query;
    };
    await Promise.all([
      expire("active", "past_due", "period_end", cutoff),
      expire("non_renewing", "canceled", "period_end", cutoff),
      expire("attention", "past_due", "grace_period_end", now),
    ]);
    return;
  }

  for (const s of mockStore.subscriptions) {
    if (companyId && s.company_id !== companyId) continue;
    if (s.status === "active" && s.period_end < cutoff) s.status = "past_due";
    else if (s.status === "non_renewing" && s.period_end < cutoff) s.status = "canceled";
    else if (s.status === "attention" && s.grace_period_end && s.grace_period_end < now) s.status = "past_due";
  }
}

export async function getSubscription(companyId: string): Promise<Subscription | null> {
  await expireLapsedSubscriptions(companyId);
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

/**
 * Paid-up statuses. "attention" (a renewal charge failed) keeps access until
 * its grace_period_end — expireLapsedSubscriptions moves it to past_due after.
 */
export function isEntitled(sub: Pick<Subscription, "status"> | null): boolean {
  return !!sub && (sub.status === "active" || sub.status === "non_renewing" || sub.status === "attention");
}

/** Job creation (and everything downstream of it) requires a real, paid-for plan — not just an account. */
export async function hasActiveSubscription(companyId: string): Promise<boolean> {
  return isEntitled(await getSubscription(companyId));
}

export async function hasLiveAiInterviewerAccess(companyId: string): Promise<boolean> {
  const [sub, plan] = await Promise.all([getSubscription(companyId), getPlanForCompany(companyId)]);
  if (!sub || !plan || !isEntitled(sub)) return false;
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
    const { data: existing } = await admin.from("subscriptions").select("*").eq("company_id", companyId).maybeSingle();

    // An existing subscription keeps its current (paid-for) plan until payment
    // actually succeeds — the callback/webhook switch plan_id from the
    // checkout metadata. Rewriting it here handed out the new plan unpaid
    // whenever a checkout was started and then abandoned or failed.
    if (existing) return existing as Subscription;

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
  if (!subscription) {
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

/** Length of one paid period for a plan — annual plans must not lapse after 30 days. */
export function periodEndFor(plan: Pick<Plan, "interval">, from = new Date()): string {
  const end = new Date(from);
  if (plan.interval === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

/** Writes subscription fields for a company, creating the row if it doesn't exist yet. */
async function upsertSubscription(companyId: string, fields: Partial<Subscription>): Promise<Subscription> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from("subscriptions").select("id").eq("company_id", companyId).maybeSingle();
    const query = existing
      ? admin.from("subscriptions").update(fields).eq("id", existing.id)
      : admin.from("subscriptions").insert({ company_id: companyId, ...fields });
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data as Subscription;
  }

  const now = new Date().toISOString();
  let subscription = mockStore.subscriptions.find((s) => s.company_id === companyId);
  if (!subscription) {
    subscription = {
      id: id(), company_id: companyId, plan_id: "", paystack_customer_code: null, paystack_subscription_code: null,
      paystack_email_token: null, paystack_authorization_code: null, status: "pending", period_start: now, period_end: now, next_payment_date: null,
      cancel_at_period_end: false, grace_period_end: null, canceled_at: null, cancellation_reason: null, created_at: now, updated_at: now,
    };
    mockStore.subscriptions.push(subscription);
  }
  Object.assign(subscription, fields, { updated_at: now });
  return subscription;
}

export interface ActivationDetails {
  customerCode: string | null;
  /** undefined keeps the stored value; null clears it. */
  subscriptionCode?: string | null;
  emailToken?: string | null;
  authorizationCode?: string | null;
  /** Paystack's own next charge date when known; otherwise one plan interval from now. */
  periodEnd?: string | null;
}

/**
 * Starts (or renews) a paid period. Undefined Paystack details keep whatever
 * is already stored, so a renewal charge that doesn't carry e.g. the email
 * token can't wipe it out.
 */
export async function activateSubscription(companyId: string, planId: string, details: ActivationDetails): Promise<Subscription> {
  const { resetApplicationUsage } = await import("@/lib/services/usage-tracking");
  const plan = await getPlan(planId);
  const now = new Date().toISOString();
  const periodEnd = details.periodEnd && new Date(details.periodEnd).getTime() > Date.now() ? new Date(details.periodEnd).toISOString() : periodEndFor(plan ?? { interval: "monthly" });

  const fields: Partial<Subscription> = {
    plan_id: planId,
    status: "active",
    period_start: now,
    period_end: periodEnd,
    next_payment_date: periodEnd,
    cancel_at_period_end: false,
    grace_period_end: null,
    canceled_at: null,
    cancellation_reason: null,
  };
  if (details.customerCode) fields.paystack_customer_code = details.customerCode;
  // null (not undefined) clears a stale code — e.g. the previous plan's subscription, just disabled.
  if (details.subscriptionCode !== undefined) fields.paystack_subscription_code = details.subscriptionCode;
  if (details.emailToken !== undefined) fields.paystack_email_token = details.emailToken;
  if (details.authorizationCode) fields.paystack_authorization_code = details.authorizationCode;

  const subscription = await upsertSubscription(companyId, fields);
  await resetApplicationUsage(companyId, subscription.id, now, periodEnd);
  return subscription;
}

/** Records the Paystack subscription identifiers without touching the paid period. */
export async function setSubscriptionPaystackDetails(companyId: string, details: { subscriptionCode?: string | null; emailToken?: string | null; customerCode?: string | null; nextPaymentDate?: string | null }): Promise<Subscription> {
  const fields: Partial<Subscription> = {};
  if (details.subscriptionCode) fields.paystack_subscription_code = details.subscriptionCode;
  if (details.emailToken) fields.paystack_email_token = details.emailToken;
  if (details.customerCode) fields.paystack_customer_code = details.customerCode;
  if (details.nextPaymentDate) fields.next_payment_date = details.nextPaymentDate;
  return upsertSubscription(companyId, fields);
}

/** Maps a Paystack webhook (which often carries no metadata) back to the company it belongs to. */
export async function findCompanyIdByPaystack(subscriptionCode?: string | null, customerCode?: string | null): Promise<string | null> {
  if (!subscriptionCode && !customerCode) return null;
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    if (subscriptionCode) {
      const { data } = await admin.from("subscriptions").select("company_id").eq("paystack_subscription_code", subscriptionCode).maybeSingle();
      if (data) return data.company_id;
    }
    if (customerCode) {
      const { data } = await admin.from("subscriptions").select("company_id").eq("paystack_customer_code", customerCode).limit(1);
      if (data?.[0]) return data[0].company_id;
    }
    return null;
  }
  const match =
    (subscriptionCode && mockStore.subscriptions.find((s) => s.paystack_subscription_code === subscriptionCode)) ||
    (customerCode && mockStore.subscriptions.find((s) => s.paystack_customer_code === customerCode));
  return match ? match.company_id : null;
}

export async function getPlanByPaystackCode(planCode: string): Promise<Plan | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("plans").select("*").eq("paystack_plan_code", planCode).maybeSingle();
    return (data as Plan | null) ?? null;
  }
  return mockStore.plans.find((p) => p.paystack_plan_code === planCode) ?? null;
}

/** A Paystack reference that's already been recorded must never grant a paid period a second time. */
export async function hasPaymentReference(reference: string): Promise<boolean> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("payments").select("id").eq("paystack_reference", reference).maybeSingle();
    return !!data;
  }
  return mockStore.payments.some((p) => p.paystack_reference === reference);
}

/** Stops renewal but keeps access until period_end — the lapse sweep cancels it after that. */
export async function cancelSubscription(companyId: string, reason: string): Promise<Subscription | null> {
  const existing = await getSubscription(companyId);
  if (!existing) return null;
  return upsertSubscription(companyId, { cancel_at_period_end: true, status: "non_renewing", canceled_at: new Date().toISOString(), cancellation_reason: reason });
}

/**
 * Undoes a pending cancellation. Only a non_renewing subscription still inside
 * its paid period can be reactivated — a canceled, lapsed, or suspended one
 * has to go back through checkout and pay.
 */
export async function reactivateSubscription(companyId: string): Promise<Subscription | null> {
  const existing = await getSubscription(companyId);
  if (!existing || existing.status !== "non_renewing" || new Date(existing.period_end).getTime() <= Date.now()) return null;
  return upsertSubscription(companyId, { cancel_at_period_end: false, canceled_at: null, cancellation_reason: null, status: "active" });
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

/**
 * Insert-only variant of recordPayment: returns null instead of overwriting
 * when the reference already exists. The unique paystack_reference makes this
 * the lock that stops a concurrent callback + webhook from fulfilling twice.
 */
export async function recordPaymentOnce(input: Parameters<typeof recordPayment>[0]): Promise<Payment | null> {
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
    const { data, error } = await admin.from("payments").insert(fields).select("*").single();
    if (error?.code === "23505") return null;
    if (error) throw error;
    return data as Payment;
  }

  if (mockStore.payments.some((p) => p.paystack_reference === input.paystackReference)) return null;
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

/** The stored webhook event for this key, if any — a failed one is reprocessed on Paystack's redelivery rather than deduplicated. */
export async function getSubscriptionEventByKey(eventKey: string): Promise<Pick<SubscriptionEvent, "id" | "processing_status"> | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("subscription_events").select("id, processing_status").eq("event_key", eventKey).maybeSingle();
    return data ?? null;
  }
  return mockStore.subscriptionEvents.find((e) => e.event_key === eventKey) ?? null;
}

export async function markEventProcessed(eventId: string, companyId: string | null): Promise<void> {
  const fields = { processing_status: "processed" as const, error: null, processed_at: new Date().toISOString(), company_id: companyId };
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("subscription_events").update(fields).eq("id", eventId);
    return;
  }
  const event = mockStore.subscriptionEvents.find((e) => e.id === eventId);
  if (event) Object.assign(event, fields);
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
