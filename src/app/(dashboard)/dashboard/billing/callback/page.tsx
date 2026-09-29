import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { verifyTransaction } from "@/lib/billing/paystack";
import { fulfillSubscriptionPayment, fulfillAddonPayment } from "@/lib/billing/fulfillment";
import { getSubscription, getPlan } from "@/lib/services/plan-access";
import { ErrorState } from "@/components/ui/states";
import { flags } from "@/lib/env";

/**
 * Activates the subscription/add-on straight off Paystack's verify response
 * — a real server-to-server call to Paystack made below, not client-supplied
 * data — instead of making the user wait on the webhook. Fulfillment is keyed
 * on the payment reference, so this and /api/webhooks/paystack (which still
 * owns renewals) can both land for the same payment without granting it twice,
 * and refreshing this page is harmless.
 */
export default async function BillingCallbackPage({ searchParams }: PageProps<"/dashboard/billing/callback">) {
  const session = await requireSession("owner");
  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : typeof params.trxref === "string" ? params.trxref : null;
  const back = { label: "Back to billing", href: "/dashboard/billing" };

  if (!reference) {
    return <ErrorState title="Missing payment reference" description="We couldn't find a payment reference for this checkout." action={back} />;
  }

  let result: Awaited<ReturnType<typeof verifyTransaction>>;
  try {
    result = await verifyTransaction(reference);
  } catch (err) {
    console.error("[billing/callback] verify failed", { reference, companyId: session.companyId, err });
    return <ErrorState title="We couldn't confirm your payment yet" description={`Paystack didn't respond. If you were charged, your plan will activate automatically within a few minutes — refresh this page, or contact support with reference ${reference}.`} action={back} />;
  }

  if (result.status !== "success") {
    return <ErrorState title="Payment not confirmed" description="Paystack reported this transaction as unsuccessful. No charge was applied." action={back} />;
  }

  // A reference only ever fulfills the company that started the checkout.
  if (flags.hasPaystack && result.metadata.company_id !== session.companyId) {
    return <ErrorState title="Payment belongs to another workspace" description="This payment reference wasn't started from this workspace." action={back} />;
  }

  const purpose = result.metadata.purpose ?? "subscription";
  let publishedJobId: string | null = null;

  try {
    if (purpose === "subscription") {
      const planId = result.metadata.plan_id ?? (await getSubscription(session.companyId))?.plan_id;
      if (planId && (await getPlan(planId))) {
        const fulfilled = await fulfillSubscriptionPayment({
          companyId: session.companyId,
          planId,
          reference,
          amountKobo: result.amount,
          currency: result.currency,
          customerCode: result.customerCode,
          planCode: result.planCode,
          authorizationCode: result.authorizationCode,
          metadata: result.metadata,
          actorUserId: session.userId,
        });
        publishedJobId = fulfilled.publishedJobId;
      }
    } else if (typeof result.metadata.sku === "string") {
      await fulfillAddonPayment({ companyId: session.companyId, sku: result.metadata.sku, reference, amountKobo: result.amount, currency: result.currency, metadata: result.metadata });
    }
  } catch (err) {
    console.error("[billing/callback] fulfillment failed", { reference, companyId: session.companyId, err });
    return <ErrorState title="Payment received — activation delayed" description={`Your payment went through, but we hit a problem activating it. It will be retried automatically; if your plan isn't active within a few minutes, contact support with reference ${reference}.`} action={back} />;
  }

  if (publishedJobId) redirect(`/dashboard/jobs/${publishedJobId}?justPaid=1`);
  redirect("/dashboard/billing?onboarding=1");
}
