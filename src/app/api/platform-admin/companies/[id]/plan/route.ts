import { NextResponse } from "next/server";
import { getPlatformAdminSession } from "@/lib/auth/platform-admin";
import { getPlan, setSubscriptionPlan } from "@/lib/services/billing";

export async function POST(request: Request, { params }: RouteContext<"/api/platform-admin/companies/[id]/plan">) {
  const admin = await getPlatformAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const plan = await getPlan(body.planId);
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const subscription = await setSubscriptionPlan(id, plan.id);
  if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ subscription });
}
