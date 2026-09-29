import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getPlan, getSubscription, startCheckout } from "@/lib/services/plan-access";
import { billingCallbackUrl } from "@/lib/billing/callback-url";
import { getJob } from "@/lib/services/jobs";
import { id } from "@/lib/data/ids";
import { initializeTransaction } from "@/lib/billing/paystack";
import { trackLifecycleEvent } from "@/lib/services/lifecycle";
import { flags } from "@/lib/env";

export async function POST(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => ({}));
  const plan = typeof body.planId === "string" ? await getPlan(body.planId) : null;
  if (!plan || !plan.active) return NextResponse.json({ error: "Select a valid plan" }, { status: 400 });
  if (plan.slug === "enterprise" || plan.amount <= 0) {
    return NextResponse.json({ error: "Enterprise plans are set up by our team — please contact sales." }, { status: 400 });
  }

  const current = await getSubscription(session.companyId);
  if (current?.plan_id === plan.id && (current.status === "active" || current.status === "non_renewing")) {
    return NextResponse.json({ error: current.status === "non_renewing" ? "You're already on this plan — use Reactivate to keep it renewing." : "You're already on this plan." }, { status: 409 });
  }

  if (flags.hasPaystack && !plan.paystack_plan_code) {
    return NextResponse.json({ error: "This plan isn't available for checkout yet — please contact support." }, { status: 503 });
  }

  // If checkout was triggered from a "publish this job" prompt, carry the job
  // through Paystack's metadata so the webhook can auto-publish it the moment
  // payment is confirmed — the user shouldn't have to come back and publish
  // manually after paying.
  let publishJobId: string | undefined;
  if (typeof body.publishJobId === "string") {
    const job = await getJob(session.companyId, body.publishJobId);
    if (job) publishJobId = job.id;
  }

  // Initialize with Paystack first: if it rejects the request, nothing about
  // the company's subscription should have changed, and the owner needs to see
  // Paystack's actual reason rather than a bare 500.
  const reference = `checkout_${id()}`;
  let authorizationUrl: string;
  try {
    ({ authorizationUrl } = await initializeTransaction({
      email: session.email,
      planCode: plan.paystack_plan_code,
      amountNaira: plan.amount,
      reference,
      callbackUrl: billingCallbackUrl(request),
      metadata: {
        company_id: session.companyId,
        user_id: session.userId,
        plan_id: plan.id,
        purpose: "subscription",
        ...(publishJobId ? { publish_job_id: publishJobId } : {}),
      },
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing/checkout] Paystack initialize failed", { companyId: session.companyId, planId: plan.id, planCode: plan.paystack_plan_code, message });
    return NextResponse.json({ error: `Payment provider error: ${message}` }, { status: 502 });
  }

  await startCheckout(session.companyId, plan.id);
  await trackLifecycleEvent(session.companyId, "subscription_started", session.userId, { plan_id: plan.id });

  return NextResponse.json({ redirectUrl: authorizationUrl });
}
