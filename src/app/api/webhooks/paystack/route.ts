import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyWebhookSignature, chargeAuthorization, disableSubscription } from "@/lib/billing/paystack";
import { fulfillSubscriptionPayment, fulfillAddonPayment } from "@/lib/billing/fulfillment";
import {
  markPastDue,
  recordSubscriptionEvent,
  getSubscriptionEventByKey,
  markEventFailed,
  markEventProcessed,
  getCompanyOwnerEmail,
  getSubscription,
  getPlan,
  getPlanByPaystackCode,
  findCompanyIdByPaystack,
  setSubscriptionPaystackDetails,
  cancelSubscription,
  setSubscriptionStatus,
  listCompanyAddons,
  listAddonProducts,
  cancelCompanyAddon,
  recordPayment,
} from "@/lib/services/plan-access";
import { trackLifecycleEvent } from "@/lib/services/lifecycle";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

/**
 * Spec Part K §23 "Webhook Security": read the raw body, validate the
 * x-paystack-signature header via HMAC SHA-512, reject invalid signatures,
 * and process idempotently by event hash. The billing callback page also
 * fulfills checkouts the moment the user returns; this route is the backstop
 * for that and the only path for everything with no browser present —
 * renewals, failed charges, cancellations.
 *
 * A failure returns 500 so Paystack redelivers, and a previously failed event
 * is reprocessed on redelivery instead of being deduplicated away.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as PaystackWebhookEvent;
  const eventKey = createHash("sha256").update(rawBody).digest("hex");

  const previous = await getSubscriptionEventByKey(eventKey);
  if (previous?.processing_status === "processed") {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  const eventId =
    previous?.id ??
    (
      await recordSubscriptionEvent({
        event_key: eventKey,
        event_type: event.event,
        company_id: null,
        subscription_id: null,
        payload: event as unknown as Record<string, unknown>,
        processed_at: null,
        processing_status: "pending",
        error: null,
        created_at: new Date().toISOString(),
      })
    ).id;

  let companyId: string | null = null;
  try {
    companyId = await resolveCompanyId(event);
    await processEvent(event, companyId);
    await markEventProcessed(eventId, companyId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhooks/paystack] processing failed", { event: event.event, companyId, message });
    await markEventFailed(eventId, message);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
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
    status?: string;
    metadata?: { company_id?: string; plan_id?: string; purpose?: string; sku?: string; publish_job_id?: string } | string | null;
    customer?: { customer_code?: string; email?: string };
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string | null;
    subscription?: { subscription_code?: string; email_token?: string; next_payment_date?: string | null };
    plan?: { plan_code?: string } | string | null;
    authorization?: { authorization_code?: string; reusable?: boolean };
  };
}

function metadataOf(event: PaystackWebhookEvent): Record<string, unknown> {
  const raw = event.data.metadata;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function subscriptionCodeOf(event: PaystackWebhookEvent): string | null {
  return event.data.subscription_code ?? event.data.subscription?.subscription_code ?? null;
}

function planCodeOf(event: PaystackWebhookEvent): string | null {
  const plan = event.data.plan;
  if (!plan) return null;
  return typeof plan === "string" ? plan : plan.plan_code ?? null;
}

/**
 * Only checkout charges carry our metadata. Renewals, invoice and
 * subscription events don't, so fall back to the Paystack subscription /
 * customer codes stored on the company's subscription.
 */
async function resolveCompanyId(event: PaystackWebhookEvent): Promise<string | null> {
  const fromMetadata = metadataOf(event).company_id;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;
  return findCompanyIdByPaystack(subscriptionCodeOf(event), event.data.customer?.customer_code ?? null);
}

async function processEvent(event: PaystackWebhookEvent, companyId: string | null) {
  if (!companyId) return; // Not ours (e.g. another product on the same Paystack account).

  switch (event.event) {
    case "charge.success":
      await handleChargeSuccess(event, companyId);
      break;
    case "subscription.create":
      await handleSubscriptionCreate(event, companyId);
      break;
    case "invoice.payment_failed": {
      if (!(await isCurrentSubscription(event, companyId))) return;
      await markPastDue(companyId, env.PAYMENT_GRACE_PERIOD_DAYS);
      await trackLifecycleEvent(companyId, "subscription_payment_failed");
      const ownerEmail = await getCompanyOwnerEmail(companyId);
      if (ownerEmail) {
        await sendEmail({ companyId, type: "payment_failed", to: ownerEmail, subject: "Your RecruitCandidates payment failed", body: `We couldn't process your latest payment. Please update your card from the Billing page within ${env.PAYMENT_GRACE_PERIOD_DAYS} days to avoid service interruption.` });
      }
      break;
    }
    case "subscription.not_renew": {
      if (!(await isCurrentSubscription(event, companyId))) return;
      const sub = await getSubscription(companyId);
      if (sub?.status === "active") await cancelSubscription(companyId, "Set to not renew via Paystack");
      break;
    }
    case "subscription.disable": {
      // Disabling the previous subscription on a plan change fires this too —
      // it must not cancel the new one.
      if (!(await isCurrentSubscription(event, companyId))) return;
      const sub = await getSubscription(companyId);
      if (!sub) return;
      if (new Date(sub.period_end).getTime() > Date.now()) {
        if (sub.status === "active") await cancelSubscription(companyId, "Disabled via Paystack");
      } else {
        await setSubscriptionStatus(companyId, "canceled");
      }
      break;
    }
    case "subscription.expiring_cards": {
      const ownerEmail = await getCompanyOwnerEmail(companyId);
      if (ownerEmail) {
        await sendEmail({ companyId, type: "card_expiring", to: ownerEmail, subject: "Your card on file is expiring soon", body: "Update your payment method before your card expires to avoid an interruption in service." });
      }
      break;
    }
    default:
      // invoice.create / invoice.update etc. are informational — charge.success is what grants access.
      break;
  }
}

async function isCurrentSubscription(event: PaystackWebhookEvent, companyId: string): Promise<boolean> {
  const code = subscriptionCodeOf(event);
  if (!code) return true;
  const sub = await getSubscription(companyId);
  return !sub?.paystack_subscription_code || sub.paystack_subscription_code === code;
}

async function handleChargeSuccess(event: PaystackWebhookEvent, companyId: string) {
  const metadata = metadataOf(event);
  const purpose = typeof metadata.purpose === "string" ? metadata.purpose : null;
  const reference = event.data.reference;
  if (!reference) return;

  if (purpose === "addon_renewal") return; // Recorded by rechargeRecurringAddons when it made the charge.

  if (purpose?.endsWith("_addon")) {
    if (typeof metadata.sku !== "string") return;
    await fulfillAddonPayment({ companyId, sku: metadata.sku, reference, amountKobo: event.data.amount ?? 0, currency: event.data.currency ?? "NGN", transactionId: event.data.id ? String(event.data.id) : null, metadata });
    return;
  }

  // Subscription checkout (our metadata) or a Paystack renewal (plan on the charge, no metadata).
  const planCode = planCodeOf(event);
  const planFromCode = planCode ? await getPlanByPaystackCode(planCode) : null;
  const planId = (typeof metadata.plan_id === "string" ? metadata.plan_id : null) ?? planFromCode?.id ?? null;
  if (purpose !== "subscription" && !planFromCode) return; // A charge that isn't for one of our plans.
  if (!planId || !(await getPlan(planId))) throw new Error(`Can't resolve plan for charge ${reference} (plan code ${planCode ?? "none"})`);

  const authorizationCode = event.data.authorization?.reusable === false ? null : event.data.authorization?.authorization_code ?? null;
  const result = await fulfillSubscriptionPayment({
    companyId,
    planId,
    reference,
    amountKobo: event.data.amount ?? 0,
    currency: event.data.currency ?? "NGN",
    customerCode: event.data.customer?.customer_code ?? null,
    planCode,
    authorizationCode,
    transactionId: event.data.id ? String(event.data.id) : null,
    metadata,
  });

  // Renewal — recharge active recurring add-ons on the same cycle.
  if (result.isRenewal && authorizationCode) {
    await rechargeRecurringAddons(companyId, authorizationCode, event.data.customer?.email ?? "");
  }
}

/**
 * Paystack creates the subscription for a plan checkout asynchronously; this
 * is where its code + email token (needed to cancel it) arrive. If the company
 * already had a different Paystack subscription, this is a plan change — stop
 * the old one billing.
 */
async function handleSubscriptionCreate(event: PaystackWebhookEvent, companyId: string) {
  const code = subscriptionCodeOf(event);
  if (!code) return;
  const existing = await getSubscription(companyId);
  const oldCode = existing?.paystack_subscription_code;
  if (oldCode?.startsWith("SUB_") && oldCode !== code && existing?.paystack_email_token) {
    try {
      await disableSubscription(oldCode, existing.paystack_email_token);
    } catch (err) {
      console.error("[webhooks/paystack] couldn't disable previous subscription", { companyId, oldCode, err });
    }
  }
  await setSubscriptionPaystackDetails(companyId, {
    subscriptionCode: code,
    emailToken: event.data.email_token ?? event.data.subscription?.email_token ?? null,
    customerCode: event.data.customer?.customer_code ?? null,
  });
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
