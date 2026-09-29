import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { cancelSubscription, getSubscription, setSubscriptionPaystackDetails } from "@/lib/services/plan-access";
import { disableSubscription, fetchSubscription, findSubscription } from "@/lib/billing/paystack";
import { getPlan } from "@/lib/services/plan-access";
import { trackLifecycleEvent } from "@/lib/services/lifecycle";
import { flags } from "@/lib/env";

/**
 * Stops the Paystack subscription from renewing, then marks ours
 * non_renewing (access continues until period_end). Paystack is told first:
 * if that fails, nothing is marked canceled here, because the card would
 * otherwise keep being charged while the dashboard says it won't be.
 */
export async function POST(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" && body.reason ? body.reason.slice(0, 500) : "Canceled by owner";

  const subscription = await getSubscription(session.companyId);
  if (!subscription || (subscription.status !== "active" && subscription.status !== "attention")) {
    return NextResponse.json({ error: "There's no active subscription to cancel." }, { status: 404 });
  }

  if (flags.hasPaystack) {
    try {
      let code = subscription.paystack_subscription_code?.startsWith("SUB_") ? subscription.paystack_subscription_code : null;
      let token = subscription.paystack_email_token;
      if (!code && subscription.paystack_customer_code) {
        const plan = await getPlan(subscription.plan_id);
        const found = plan?.paystack_plan_code ? await findSubscription(subscription.paystack_customer_code, plan.paystack_plan_code) : null;
        code = found?.subscriptionCode ?? null;
        token = found?.emailToken ?? null;
      }
      if (code) {
        if (!token) token = (await fetchSubscription(code)).emailToken;
        await disableSubscription(code, token);
        await setSubscriptionPaystackDetails(session.companyId, { subscriptionCode: code, emailToken: token });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[billing/cancel] Paystack disable failed", { companyId: session.companyId, message });
      return NextResponse.json({ error: `We couldn't cancel with the payment provider (${message}). Nothing was changed — please try again or contact support.` }, { status: 502 });
    }
  }

  const updated = await cancelSubscription(session.companyId, reason);
  await trackLifecycleEvent(session.companyId, "subscription_cancelled", session.userId, { reason });
  return NextResponse.json({ subscription: updated });
}
