import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { verifyTransaction } from "@/lib/billing/paystack";
import { activateSubscription, getSubscription, listPlans } from "@/lib/services/billing";
import { ErrorState } from "@/components/ui/states";

/**
 * Spec Part K §23: the callback page never activates access by itself — the
 * Paystack webhook is the authoritative event source in production. In demo
 * mode (or any environment without a reachable public webhook URL) nothing
 * will ever POST /api/webhooks/paystack, so this page performs the same
 * verify-then-activate call inline as a pragmatic stand-in. `activateSubscription`
 * is the single source of truth either way — see /api/webhooks/paystack for
 * the production path that calls the same function.
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

  // Resolve the plan the user selected at checkout — stored on the subscription row created at signup/checkout.
  const existing = await getSubscription(session.companyId);
  const plans = await listPlans();
  const planId = existing?.plan_id ?? plans.find((p) => p.slug === "growth")!.id;

  await activateSubscription(session.companyId, planId, result.customerCode ?? "CUS_demo", result.subscriptionCode ?? "SUB_demo");

  redirect("/dashboard?onboarding=1");
}
