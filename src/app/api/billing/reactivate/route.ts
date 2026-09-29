import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getPlan, getSubscription, reactivateSubscription, setSubscriptionPaystackDetails } from "@/lib/services/plan-access";
import { createSubscription } from "@/lib/billing/paystack";
import { flags } from "@/lib/env";

/**
 * Undoes a pending cancellation while the paid period is still running.
 * Paystack can't re-enable a disabled subscription, so this starts a new one
 * on the saved card whose first charge lands when the current period ends —
 * no charge now, no gap later. A lapsed or canceled subscription can't be
 * resumed for free; it goes back through checkout.
 */
export async function POST() {
  const session = await requireSession("owner");
  const subscription = await getSubscription(session.companyId);
  if (!subscription || subscription.status !== "non_renewing" || new Date(subscription.period_end).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This subscription can't be resumed — choose a plan to subscribe again.", requiresPlan: true }, { status: 409 });
  }

  if (flags.hasPaystack) {
    const plan = await getPlan(subscription.plan_id);
    if (!plan?.paystack_plan_code || !subscription.paystack_customer_code || !subscription.paystack_authorization_code) {
      return NextResponse.json({ error: "We don't have a reusable card on file — choose a plan to subscribe again.", requiresPlan: true }, { status: 409 });
    }
    try {
      const created = await createSubscription({
        customerCode: subscription.paystack_customer_code,
        planCode: plan.paystack_plan_code,
        authorizationCode: subscription.paystack_authorization_code,
        startDate: subscription.period_end,
      });
      await setSubscriptionPaystackDetails(session.companyId, { subscriptionCode: created.subscriptionCode, emailToken: created.emailToken });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[billing/reactivate] Paystack subscription create failed", { companyId: session.companyId, message });
      return NextResponse.json({ error: `We couldn't resume billing with the payment provider (${message}). Choose a plan to subscribe again.`, requiresPlan: true }, { status: 409 });
    }
  }

  const updated = await reactivateSubscription(session.companyId);
  return NextResponse.json({ subscription: updated });
}
