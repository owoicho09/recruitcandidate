import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { verifyTransaction } from "@/lib/billing/paystack";
import { activateSubscription, getSubscription, getPlan, getAddonProductBySku, fulfillAddonPurchase, recordPayment } from "@/lib/services/plan-access";
import { flags } from "@/lib/env";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

/**
 * Never activates a plan or add-on by itself in live mode — the Paystack
 * webhook is the sole source of truth there (spec: "do not activate plans or
 * add-ons from the browser callback alone"). This page's inline
 * verify-then-activate shortcut only runs in demo mode, where no real
 * webhook can ever reach /api/webhooks/paystack. In live mode it's a plain
 * "payment received, confirming" holding screen.
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

  if (!flags.hasPaystack) {
    const purpose = result.metadata.purpose ?? "subscription";

    if (purpose === "subscription") {
      const existing = await getSubscription(session.companyId);
      const planId = result.metadata.plan_id ?? existing?.plan_id;
      if (planId) {
        const subscription = await activateSubscription(session.companyId, planId, result.customerCode ?? "CUS_demo", result.subscriptionCode ?? "SUB_demo", result.authorizationCode ?? undefined);
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
          amount: result.amount,
          currency: result.currency,
          status: "success",
          paidAt: new Date().toISOString(),
          metadata: result.metadata,
        });
      }
    }

    redirect("/dashboard/billing?onboarding=1");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2 className="size-10 text-success" />
      <h1 className="text-xl font-semibold text-foreground">Payment received</h1>
      <p className="text-sm text-foreground-muted">
        We&apos;re confirming your payment with Paystack — this usually takes a few seconds. Your plan will update automatically once confirmed.
      </p>
      <Button href="/dashboard/billing" className="mt-2">Back to billing</Button>
    </div>
  );
}
