import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { jobSchema } from "@/lib/validation/job";
import { updateJob } from "@/lib/services/jobs";

export async function PATCH(request: Request, { params }: RouteContext<"/api/jobs/[id]">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = jobSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const job = await updateJob(session.companyId, id, parsed.data);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
