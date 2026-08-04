import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { cancelSubscription } from "@/lib/services/billing";

export async function POST(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => ({}));
  const subscription = await cancelSubscription(session.companyId, body.reason ?? "Canceled by owner");
  if (!subscription) return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  return NextResponse.json({ subscription });
}
