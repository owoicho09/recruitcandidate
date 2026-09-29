import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { hasActiveSubscription } from "@/lib/services/plan-access";
import { draftRejection } from "@/lib/services/rejections";

export async function POST(request: Request) {
  const session = await requireSession("reviewer");
  const body = await request.json().catch(() => ({}));
  const { applicationId, feedbackMode } = body;
  if (typeof applicationId !== "string") return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  if (!(await hasActiveSubscription(session.companyId))) {
    return NextResponse.json({ error: "Your subscription isn't active. Renew your plan to keep inviting and processing candidates.", requiresPlan: true }, { status: 402 });
  }

  const result = await draftRejection(session.companyId, applicationId, feedbackMode ?? "concise");
  if (!result) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json(result);
}
