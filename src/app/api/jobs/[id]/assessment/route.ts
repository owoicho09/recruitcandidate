import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { assessmentSchema } from "@/lib/validation/assessment";
import { saveAssessment } from "@/lib/services/assessments";

export async function PUT(request: Request, { params }: RouteContext<"/api/jobs/[id]/assessment">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const assessment = await saveAssessment(session.companyId, id, parsed.data);
  return NextResponse.json({ assessment });
}
