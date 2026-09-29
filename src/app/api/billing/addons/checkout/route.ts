import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getAddonProductBySku, getPlanForCompany, hasActiveSubscription } from "@/lib/services/plan-access";
import { initializeTransaction } from "@/lib/billing/paystack";
import { billingCallbackUrl } from "@/lib/billing/callback-url";
import { id } from "@/lib/data/ids";
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
  try {
    const { authorizationUrl } = await initializeTransaction({
      email: session.email,
      reference,
      callbackUrl: billingCallbackUrl(request),
      metadata: { company_id: session.companyId, user_id: session.userId, purpose: `${addon.kind}_addon`, sku: addon.sku },
      amountNaira: addon.amount,
    });
    return NextResponse.json({ redirectUrl: authorizationUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing/addons/checkout] Paystack initialize failed", { companyId: session.companyId, sku: addon.sku, message });
    return NextResponse.json({ error: `Payment provider error: ${message}` }, { status: 502 });
  }
}
