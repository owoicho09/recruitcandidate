import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { duplicateJob } from "@/lib/services/jobs";

export async function POST(request: Request, { params }: RouteContext<"/api/jobs/[id]/duplicate">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const job = await duplicateJob(session.companyId, id, session.userId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
