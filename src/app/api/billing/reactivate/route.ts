import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { reactivateSubscription } from "@/lib/services/billing";

export async function POST() {
  const session = await requireSession("owner");
  const subscription = await reactivateSubscription(session.companyId);
  if (!subscription) return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  return NextResponse.json({ subscription });
}
