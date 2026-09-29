import "server-only";
import { findSubscription, disableSubscription } from "@/lib/billing/paystack";
import {
  activateSubscription,
  fulfillAddonPurchase,
  getAddonProductBySku,
  getSubscription,
  getPlan,
  getCompanyOwnerEmail,
  hasPaymentReference,
  isEntitled,
  recordPayment,
  recordPaymentOnce,
} from "@/lib/services/plan-access";
import { setJobStatus, countActiveJobs } from "@/lib/services/jobs";
import { checkUsage } from "@/lib/services/usage-tracking";
import { trackLifecycleEvent, recomputeLifecycleSegment } from "@/lib/services/lifecycle";
import { sendEmail } from "@/lib/email/resend";
import type { Subscription } from "@/types/database";

export interface SubscriptionPayment {
  companyId: string;
  planId: string;
  reference: string;
  /** Kobo, as Paystack reports it. */
  amountKobo: number;
  currency: string;
  customerCode: string | null;
  planCode: string | null;
  authorizationCode: string | null;
  transactionId?: string | null;
  metadata: Record<string, unknown>;
  actorUserId?: string | null;
}

export interface FulfillmentResult {
  subscription: Subscription | null;
  alreadyProcessed: boolean;
  /** A charge on an already-paid subscription that wasn't started from our checkout — i.e. Paystack's automatic renewal. */
  isRenewal: boolean;
  publishedJobId: string | null;
}

/**
 * The single place a successful subscription charge turns into a paid period.
 * Both the checkout callback page (user's browser) and the Paystack webhook
 * (server-to-server, and the only path for renewals) land here, so they can't
 * drift apart — and because the payment reference is recorded, whichever
 * arrives second is a no-op instead of granting the period twice.
 */
export async function fulfillSubscriptionPayment(payment: SubscriptionPayment): Promise<FulfillmentResult> {
  if (await hasPaymentReference(payment.reference)) {
    return { subscription: await getSubscription(payment.companyId), alreadyProcessed: true, isRenewal: false, publishedJobId: null };
  }

  const existing = await getSubscription(payment.companyId);
  const paymentRecord = {
    companyId: payment.companyId,
    subscriptionId: existing?.id ?? null,
    paystackReference: payment.reference,
    paystackTransactionId: payment.transactionId ?? null,
    amount: Math.round(payment.amountKobo / 100),
    currency: payment.currency,
    status: "success" as const,
    paidAt: new Date().toISOString(),
    metadata: payment.metadata,
  };
  // Claim the reference before granting anything — whichever of callback/webhook loses the race stops here.
  if (!(await recordPaymentOnce(paymentRecord))) {
    return { subscription: existing, alreadyProcessed: true, isRenewal: false, publishedJobId: null };
  }
  const wasEntitled = isEntitled(existing);
  const isNewCheckout = payment.reference.startsWith("checkout_");

  // The subscription Paystack creates for a plan checkout isn't on the
  // transaction itself; its code + email token are needed to cancel later.
  let paystackSub: Awaited<ReturnType<typeof findSubscription>> = null;
  if (payment.customerCode && payment.planCode) {
    try {
      paystackSub = await findSubscription(payment.customerCode, payment.planCode);
    } catch (err) {
      console.error("[billing] Couldn't look up Paystack subscription", { companyId: payment.companyId, reference: payment.reference, err });
    }
  }

  // If the new subscription's code isn't known yet, the stored one is kept:
  // the subscription.create webhook then sees the mismatch, disables the old
  // subscription, and records the new code.
  const subscription = await activateSubscription(payment.companyId, payment.planId, {
    customerCode: payment.customerCode,
    subscriptionCode: paystackSub?.subscriptionCode,
    emailToken: paystackSub?.emailToken,
    authorizationCode: payment.authorizationCode,
    periodEnd: paystackSub?.nextPaymentDate,
  });

  if (paymentRecord.subscriptionId !== subscription.id) await recordPayment({ ...paymentRecord, subscriptionId: subscription.id });

  // Switching plans starts a new Paystack subscription — the old one must stop
  // billing, or the customer is charged for both.
  const previousCode = existing?.paystack_subscription_code;
  const previousToken = existing?.paystack_email_token;
  if (isNewCheckout && paystackSub && previousCode?.startsWith("SUB_") && previousToken && previousCode !== paystackSub.subscriptionCode) {
    try {
      await disableSubscription(previousCode, previousToken);
    } catch (err) {
      console.error("[billing] Couldn't disable previous Paystack subscription", { companyId: payment.companyId, previousCode, err });
    }
  }

  if (!wasEntitled) {
    await trackLifecycleEvent(payment.companyId, "subscription_activated", payment.actorUserId ?? null, { plan_id: payment.planId });
    const [ownerEmail, plan] = await Promise.all([getCompanyOwnerEmail(payment.companyId), getPlan(payment.planId)]);
    if (ownerEmail) {
      const validTill = new Date(subscription.period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      await sendEmail({
        companyId: payment.companyId,
        type: "subscription_activated",
        to: ownerEmail,
        subject: "Your RecruitCandidates subscription is active",
        body: `Your subscription has been activated${plan ? ` on the ${plan.name} plan` : ""}, valid till ${validTill}. You now have full access to RecruitCandidates — thanks for subscribing!`,
      });
    }
  }

  // Checkout was triggered from a "publish this job" prompt — finish what the
  // payment was actually for instead of leaving the user to come back and
  // publish manually.
  let publishedJobId: string | null = null;
  const publishJobId = typeof payment.metadata.publish_job_id === "string" ? payment.metadata.publish_job_id : null;
  if (publishJobId && (await checkUsage(payment.companyId, "active_jobs")).allowed) {
    const wasFirstPublish = (await countActiveJobs(payment.companyId)) === 0;
    const job = await setJobStatus(payment.companyId, publishJobId, "published");
    if (job) {
      publishedJobId = job.id;
      if (wasFirstPublish) await trackLifecycleEvent(payment.companyId, "first_job_published", payment.actorUserId ?? null);
      else await recomputeLifecycleSegment(payment.companyId);
    }
  }

  return { subscription, alreadyProcessed: false, isRenewal: wasEntitled && !isNewCheckout, publishedJobId };
}

export interface AddonPayment {
  companyId: string;
  sku: string;
  reference: string;
  amountKobo: number;
  currency: string;
  transactionId?: string | null;
  metadata: Record<string, unknown>;
}

/** Add-on counterpart of fulfillSubscriptionPayment — same once-per-reference guarantee, so a page refresh or webhook redelivery can't stack the add-on again. */
export async function fulfillAddonPayment(payment: AddonPayment): Promise<{ alreadyProcessed: boolean }> {
  if (await hasPaymentReference(payment.reference)) return { alreadyProcessed: true };

  const addon = await getAddonProductBySku(payment.sku);
  if (!addon) throw new Error(`Unknown add-on SKU ${payment.sku}`);

  // Record first: the unique reference is the lock that makes a concurrent callback + webhook a no-op for the loser.
  const subscription = await getSubscription(payment.companyId);
  const claimed = await recordPaymentOnce({
    companyId: payment.companyId,
    subscriptionId: subscription?.id ?? null,
    paystackReference: payment.reference,
    paystackTransactionId: payment.transactionId ?? null,
    amount: Math.round(payment.amountKobo / 100),
    currency: payment.currency,
    status: "success",
    paidAt: new Date().toISOString(),
    metadata: payment.metadata,
  });
  if (!claimed) return { alreadyProcessed: true };
  await fulfillAddonPurchase(payment.companyId, addon, payment.reference);
  return { alreadyProcessed: false };
}
