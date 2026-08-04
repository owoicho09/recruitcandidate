import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getPlan, startCheckout } from "@/lib/services/billing";
import { id } from "@/lib/data/ids";
import { initializeTransaction } from "@/lib/billing/paystack";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => ({}));
  const plan = await getPlan(body.planId);
  if (!plan) return NextResponse.json({ error: "Select a valid plan" }, { status: 400 });

  await startCheckout(session.companyId, plan.id);

  const reference = `checkout_${id()}`;
  const { authorizationUrl } = await initializeTransaction({
    email: session.email,
    planCode: plan.paystack_plan_code,
    reference,
    callbackUrl: env.PAYSTACK_CALLBACK_URL,
    metadata: { company_id: session.companyId, user_id: session.userId, plan_id: plan.id },
  });

  return NextResponse.json({ redirectUrl: authorizationUrl });
}
