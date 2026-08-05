import { NextResponse } from "next/server";
import { getPlatformAdminSession } from "@/lib/auth/platform-admin";
import { setSubscriptionStatus } from "@/lib/services/plan-access";

export async function POST(request: Request, { params }: RouteContext<"/api/platform-admin/companies/[id]/suspend">) {
  const admin = await getPlatformAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscription = await setSubscriptionStatus(id, "canceled");
  if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ subscription });
}
