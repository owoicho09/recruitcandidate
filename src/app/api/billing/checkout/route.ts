import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getPlan, startCheckout } from "@/lib/services/plan-access";
import { getJob } from "@/lib/services/jobs";
import { id } from "@/lib/data/ids";
import { initializeTransaction } from "@/lib/billing/paystack";
import { trackLifecycleEvent } from "@/lib/services/lifecycle";
import { env, flags } from "@/lib/env";

export async function POST(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => ({}));
  const plan = await getPlan(body.planId);
  if (!plan) return NextResponse.json({ error: "Select a valid plan" }, { status: 400 });

  if (flags.hasPaystack && plan.slug !== "enterprise" && !plan.paystack_plan_code) {
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

  await startCheckout(session.companyId, plan.id);
  await trackLifecycleEvent(session.companyId, "subscription_started", session.userId, { plan_id: plan.id });

  const reference = `checkout_${id()}`;
  const { authorizationUrl } = await initializeTransaction({
    email: session.email,
    planCode: plan.paystack_plan_code,
    amountNaira: plan.amount,
    reference,
    callbackUrl: env.PAYSTACK_CALLBACK_URL,
    metadata: {
      company_id: session.companyId,
      user_id: session.userId,
      plan_id: plan.id,
      purpose: "subscription",
      ...(publishJobId ? { publish_job_id: publishJobId } : {}),
    },
  });

  return NextResponse.json({ redirectUrl: authorizationUrl });
}
