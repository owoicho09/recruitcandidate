import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { moveApplicationStage } from "@/lib/services/applications";

const VALID = ["applied", "cv_screened", "shortlisted", "assessment", "video_interview", "qualified", "rejected", "on_hold", "withdrawn"];

export async function POST(request: Request, { params }: RouteContext<"/api/applications/[id]/stage">) {
  const session = await requireSession("reviewer");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!VALID.includes(body.stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const application = await moveApplicationStage(session.companyId, id, body.stage, session.userId);
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json({ application });
}
