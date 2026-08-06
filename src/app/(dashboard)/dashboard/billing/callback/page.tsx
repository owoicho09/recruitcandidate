import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { verifyTransaction } from "@/lib/billing/paystack";
import {
  activateSubscription,
  getSubscription,
  getPlan,
  getAddonProductBySku,
  fulfillAddonPurchase,
  recordPayment,
  getCompanyOwnerEmail,
} from "@/lib/services/plan-access";
import { setJobStatus, listJobs } from "@/lib/services/jobs";
import { trackLifecycleEvent, recomputeLifecycleSegment } from "@/lib/services/lifecycle";
import { sendEmail } from "@/lib/email/resend";
import { ErrorState } from "@/components/ui/states";

/**
 * Activates the subscription/add-on straight off Paystack's verify response
 * — a real server-to-server call to Paystack made below, not client-supplied
 * data — instead of making the user wait on the webhook. activateSubscription
 * and recordPayment both upsert by company/reference, so this is safe to run
 * alongside /api/webhooks/paystack, which still fires and stays the only path
 * for renewals (no browser present) and stays a harmless no-op here when it
 * lands after this page already activated things.
 */
export default async function BillingCallbackPage({ searchParams }: PageProps<"/dashboard/billing/callback">) {
  const session = await requireSession("owner");
  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : null;

  if (!reference) {
    return <ErrorState title="Missing payment reference" description="We couldn't find a payment reference for this checkout." action={{ label: "Back to billing", href: "/dashboard/billing" }} />;
  }

  const result = await verifyTransaction(reference);
  if (result.status !== "success") {
    return <ErrorState title="Payment not confirmed" description="Paystack reported this transaction as unsuccessful. No charge was applied." action={{ label: "Back to billing", href: "/dashboard/billing" }} />;
  }

  const purpose = result.metadata.purpose ?? "subscription";
  const publishJobId = typeof result.metadata.publish_job_id === "string" ? result.metadata.publish_job_id : null;

  if (purpose === "subscription") {
    const existing = await getSubscription(session.companyId);
    const wasAlreadyActive = existing?.status === "active" || existing?.status === "non_renewing";
    const planId = result.metadata.plan_id ?? existing?.plan_id;

    if (planId) {
      const subscription = await activateSubscription(
        session.companyId,
        planId,
        result.customerCode ?? "CUS_unknown",
        result.subscriptionCode ?? "SUB_unknown",
        result.authorizationCode ?? undefined,
      );
      const purchasedPlan = await getPlan(planId);
      await recordPayment({
        companyId: session.companyId,
        subscriptionId: subscription.id,
        paystackReference: reference,
        paystackTransactionId: null,
        amount: purchasedPlan?.amount ?? 0,
        currency: purchasedPlan?.currency ?? "NGN",
        status: "success",
        paidAt: new Date().toISOString(),
        metadata: result.metadata,
      });

      if (!wasAlreadyActive) {
        await trackLifecycleEvent(session.companyId, "subscription_activated", session.userId, { plan_id: planId });
        const ownerEmail = await getCompanyOwnerEmail(session.companyId);
        if (ownerEmail && purchasedPlan) {
          const validTill = new Date(subscription.period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
          await sendEmail({
            companyId: session.companyId,
            type: "subscription_activated",
            to: ownerEmail,
            subject: "Your RecruitCandidates subscription is active",
            body: `Your subscription has been activated on the ${purchasedPlan.name} plan, valid till ${validTill}. You now have full access to RecruitCandidates — thanks for subscribing!`,
          });
        }
      }
    }

    if (publishJobId) {
      const wasFirstPublish = !(await listJobs(session.companyId)).some((j) => j.status === "published");
      await setJobStatus(session.companyId, publishJobId, "published");
      if (wasFirstPublish) await trackLifecycleEvent(session.companyId, "first_job_published", session.userId);
      else await recomputeLifecycleSegment(session.companyId);
      redirect(`/dashboard/jobs/${publishJobId}?justPaid=1`);
    }
  } else {
    const sku = result.metadata.sku as string | undefined;
    const addon = sku ? await getAddonProductBySku(sku) : null;
    if (addon) {
      await fulfillAddonPurchase(session.companyId, addon, reference);
      const subscription = await getSubscription(session.companyId);
      await recordPayment({
        companyId: session.companyId,
        subscriptionId: subscription?.id ?? null,
        paystackReference: reference,
        paystackTransactionId: null,
        amount: Math.round(result.amount / 100),
        currency: result.currency,
        status: "success",
        paidAt: new Date().toISOString(),
        metadata: result.metadata,
      });
    }
  }

  redirect("/dashboard/billing?onboarding=1");
}
