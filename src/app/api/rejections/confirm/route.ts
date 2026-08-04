import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { confirmRejection } from "@/lib/services/rejections";

export async function POST(request: Request) {
  const session = await requireSession("reviewer");
  const body = await request.json().catch(() => ({}));
  const { applicationId, stage, internalReason, aiDraft, finalMessage, feedbackMode, sendEmailToggle } = body;

  if (typeof applicationId !== "string" || typeof finalMessage !== "string") {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const record = await confirmRejection(session.companyId, {
    applicationId,
    stage: stage ?? "shortlisted",
    internalReason: internalReason ?? "",
    aiDraft: aiDraft ?? finalMessage,
    finalMessage,
    feedbackMode: feedbackMode ?? "concise",
    sendEmailToggle: Boolean(sendEmailToggle),
    rejectedBy: session.userId,
  });

  if (!record) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json({ record });
}
