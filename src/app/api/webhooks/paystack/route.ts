import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyWebhookSignature, chargeAuthorization } from "@/lib/billing/paystack";
import {
  activateSubscription,
  cancelSubscription,
  markPastDue,
  hasProcessedEvent,
  recordSubscriptionEvent,
  markEventFailed,
  setSubscriptionCancelAtPeriodEnd,
  setSubscriptionStatus,
  getCompanyOwnerEmail,
  getSubscription,
  listCompanyAddons,
  listAddonProducts,
  getAddonProductBySku,
  fulfillAddonPurchase,
  cancelCompanyAddon,
  recordPayment,
} from "@/lib/services/plan-access";
import { setJobStatus } from "@/lib/services/jobs";
import { trackLifecycleEvent } from "@/lib/services/lifecycle";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

/**
 * Spec Part K §23 "Webhook Security": read the raw body, validate the
 * x-paystack-signature header via HMAC SHA-512, reject invalid signatures,
 * process idempotently by event hash, and return quickly. This is the
 * authoritative subscription/add-on event source in production — the
 * demo-mode checkout callback performs the same activation inline since no
 * real Paystack instance can reach this route from a local/demo deployment.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventKey = createHash("sha256").update(rawBody).digest("hex");

  if (await hasProcessedEvent(eventKey)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  const companyId: string | undefined = event.data?.metadata?.company_id;
  const record = await recordSubscriptionEvent({
    event_key: eventKey,
    event_type: event.event,
    company_id: companyId ?? null,
    subscription_id: null,
    payload: event,
    processed_at: new Date().toISOString(),
    processing_status: "processed",
    error: null,
    created_at: new Date().toISOString(),
  });

  try {
    await processEvent(event, companyId);
  } catch (err) {
    await markEventFailed(record.id, err instanceof Error ? err.message : "Unknown error");
  }

  return NextResponse.json({ ok: true });
}

interface PaystackWebhookEvent {
  event: string;
  data: {
    id?: number;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: { plan_id?: string; purpose?: string; sku?: string; publish_job_id?: string };
    customer?: { customer_code?: string; email?: string };
    subscription_code?: string;
    plan?: { plan_code?: string };
    authorization?: { authorization_code?: string };
  };
}

async function processEvent(event: PaystackWebhookEvent, companyId?: string) {
  // Paystack carries a subscription's original metadata forward onto its own
  // recurring renewal charges, so "subscription" is both the explicit purpose
  // set at checkout and the correct default for Paystack-initiated renewals.
  const purpose = event.data.metadata?.purpose ?? "subscription";

  switch (event.event) {
    case "charge.success":
    case "subscription.create": {
      if (!companyId) return;
      if (purpose === "subscription") await handleSubscriptionCharge(event, companyId);
      else await handleAddonCharge(event, companyId);
      break;
    }
    case "invoice.payment_failed": {
      if (!companyId) return;
      await markPastDue(companyId, env.PAYMENT_GRACE_PERIOD_DAYS);
      await trackLifecycleEvent(companyId, "subscription_payment_failed");
      const ownerEmail = await getCompanyOwnerEmail(companyId);
      if (ownerEmail) {
        await sendEmail({ companyId, type: "payment_failed", to: ownerEmail, subject: "Your RecruitCandidates payment failed", body: "We couldn't process your latest payment. Please update your payment method to avoid service interruption." });
      }
      break;
    }
    case "subscription.not_renew": {
      if (!companyId) return;
      await setSubscriptionCancelAtPeriodEnd(companyId, true);
      break;
    }
    case "subscription.disable": {
      if (!companyId) return;
      await cancelSubscription(companyId, "Disabled via Paystack");
      await setSubscriptionStatus(companyId, "canceled");
      break;
    }
    case "subscription.expiring_cards": {
      if (!companyId) return;
      const ownerEmail = await getCompanyOwnerEmail(companyId);
      if (ownerEmail) {
        await sendEmail({ companyId, type: "card_expiring", to: ownerEmail, subject: "Your card on file is expiring soon", body: "Update your payment method before your card expires to avoid an interruption in service." });
      }
      break;
    }
    case "invoice.create":
    case "invoice.update":
      // Informational — surfaced via the billing dashboard's payment history, no state change needed.
      break;
    default:
      break;
  }
}

async function handleSubscriptionCharge(event: PaystackWebhookEvent, companyId: string) {
  const planId = event.data.metadata?.plan_id ?? (await resolveFallbackPlanId());
  const authorizationCode = event.data.authorization?.authorization_code;

  const existing = await getSubscription(companyId);
  const wasAlreadyActive = existing?.status === "active" || existing?.status === "non_renewing";

  const subscription = await activateSubscription(
    companyId,
    planId,
    event.data.customer?.customer_code ?? "CUS_unknown",
    event.data.subscription_code ?? event.data.plan?.plan_code ?? "SUB_unknown",
    authorizationCode,
  );

  if (!wasAlreadyActive) await trackLifecycleEvent(companyId, "subscription_activated", null, { plan_id: planId });

  if (event.data.reference) {
    await recordPayment({
      companyId,
      subscriptionId: subscription.id,
      paystackReference: event.data.reference,
      paystackTransactionId: event.data.id ? String(event.data.id) : null,
      amount: koboToNaira(event.data.amount),
      currency: event.data.currency ?? "NGN",
      status: "success",
      paidAt: new Date().toISOString(),
      metadata: event.data.metadata ?? {},
    });
  }

  // Renewal (not the first activation) — recharge active recurring add-ons on the same cycle.
  if (wasAlreadyActive && authorizationCode) {
    await rechargeRecurringAddons(companyId, authorizationCode, event.data.customer?.email ?? "");
  }

  // Checkout was triggered from a "publish this job" prompt — finish what the
  // payment was actually for instead of leaving the user to come back and
  // publish manually.
  const publishJobId = event.data.metadata?.publish_job_id;
  if (publishJobId) {
    await setJobStatus(companyId, publishJobId, "published");
  }
}

async function handleAddonCharge(event: PaystackWebhookEvent, companyId: string) {
  const sku = event.data.metadata?.sku;
  if (!sku || !event.data.reference) return;

  const addon = await getAddonProductBySku(sku);
  if (!addon) return;

  await fulfillAddonPurchase(companyId, addon, event.data.reference);

  const subscription = await getSubscription(companyId);
  await recordPayment({
    companyId,
    subscriptionId: subscription?.id ?? null,
    paystackReference: event.data.reference,
    paystackTransactionId: event.data.id ? String(event.data.id) : null,
    amount: koboToNaira(event.data.amount),
    currency: event.data.currency ?? "NGN",
    status: "success",
    paidAt: new Date().toISOString(),
    metadata: event.data.metadata ?? {},
  });
}

/** Paystack reports amounts in kobo; this app stores/displays whole Naira, matching plans.amount. */
function koboToNaira(amount: number | undefined): number {
  return Math.round((amount ?? 0) / 100);
}

/**
 * Recurring add-ons (extra jobs, extra team members) aren't their own Paystack
 * subscription — Paystack doesn't support multiple plans on one subscription —
 * so they ride the base subscription's own renewal, recharged here via the
 * authorization code captured from that same successful charge. A failed
 * recharge cancels the add-on (it stops counting toward the effective limit)
 * rather than leaving it silently unpaid.
 */
async function rechargeRecurringAddons(companyId: string, authorizationCode: string, email: string) {
  const [addons, products] = await Promise.all([listCompanyAddons(companyId, "active"), listAddonProducts()]);
  const recurring = addons.filter((a) => a.billing_type === "recurring");
  if (recurring.length === 0) return;

  const totalAmount = recurring.reduce((sum, a) => sum + (products.find((p) => p.sku === a.sku)?.amount ?? 0), 0);
  if (totalAmount <= 0) return;

  const reference = `addon_renewal_${Date.now()}_${companyId.slice(0, 8)}`;
  try {
    const result = await chargeAuthorization(authorizationCode, email, totalAmount, reference, { company_id: companyId, purpose: "addon_renewal" });
    if (result.status !== "success") throw new Error("Recharge declined");

    const subscription = await getSubscription(companyId);
    await recordPayment({
      companyId,
      subscriptionId: subscription?.id ?? null,
      paystackReference: reference,
      paystackTransactionId: null,
      amount: totalAmount,
      currency: "NGN",
      status: "success",
      paidAt: new Date().toISOString(),
      metadata: { purpose: "addon_renewal", skus: recurring.map((a) => a.sku) },
    });
  } catch {
    await Promise.all(recurring.map((a) => cancelCompanyAddon(a.id)));
    const ownerEmail = await getCompanyOwnerEmail(companyId);
    if (ownerEmail) {
      await sendEmail({
        companyId,
        type: "payment_failed",
        to: ownerEmail,
        subject: "Your add-on renewal failed",
        body: "We couldn't renew your extra jobs/team member add-ons this billing period, so they've been removed. You can repurchase them any time from the billing page.",
      });
    }
  }
}

async function resolveFallbackPlanId(): Promise<string> {
  const { flags } = await import("@/lib/env");
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("plans").select("id").eq("slug", "growth").eq("interval", "monthly").single();
    return data!.id;
  }
  const { mockStore } = await import("@/lib/data/store");
  return mockStore.plans.find((p) => p.slug === "growth" && p.interval === "monthly")!.id;
}
