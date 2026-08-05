import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getAddonProductBySku, getPlanForCompany, hasActiveSubscription } from "@/lib/services/plan-access";
import { initializeTransaction } from "@/lib/billing/paystack";
import { id } from "@/lib/data/ids";
import { env } from "@/lib/env";
import type { PlanSlug } from "@/types/database";

const PLAN_RANK: Record<PlanSlug, number> = { starter: 0, growth: 1, scale: 2, enterprise: 3 };

export async function POST(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => ({}));
  const sku = body.sku;
  if (typeof sku !== "string") return NextResponse.json({ error: "Missing sku" }, { status: 400 });

  if (!(await hasActiveSubscription(session.companyId))) {
    return NextResponse.json({ error: "Choose a plan first." }, { status: 402 });
  }

  const addon = await getAddonProductBySku(sku);
  if (!addon) return NextResponse.json({ error: "Unknown add-on" }, { status: 400 });

  if (addon.min_plan_slug) {
    const plan = await getPlanForCompany(session.companyId);
    if (!plan || PLAN_RANK[plan.slug] < PLAN_RANK[addon.min_plan_slug]) {
      return NextResponse.json({ error: `Upgrade to ${addon.min_plan_slug} or higher to buy this.` }, { status: 403 });
    }
  }

  const reference = `addon_${id()}`;
  const { authorizationUrl } = await initializeTransaction({
    email: session.email,
    reference,
    callbackUrl: env.PAYSTACK_CALLBACK_URL,
    metadata: { company_id: session.companyId, user_id: session.userId, purpose: `${addon.kind}_addon`, sku: addon.sku },
    amountNaira: addon.amount,
  });

  return NextResponse.json({ redirectUrl: authorizationUrl });
}
