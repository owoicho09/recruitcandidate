import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { videoInterviewSchema } from "@/lib/validation/video-interview";
import { saveVideoInterview } from "@/lib/services/video-interviews";

export async function PUT(request: Request, { params }: RouteContext<"/api/jobs/[id]/video-interview">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = videoInterviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const interview = await saveVideoInterview(session.companyId, id, parsed.data);
  return NextResponse.json({ interview });
}
