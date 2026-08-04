import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { setJobStatus, countActiveJobs } from "@/lib/services/jobs";
import { checkUsage } from "@/lib/services/billing";

const VALID = ["draft", "published", "paused", "closed", "archived"] as const;

export async function POST(request: Request, { params }: RouteContext<"/api/jobs/[id]/status">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (!VALID.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  if (status === "published") {
    const usage = await checkUsage(session.companyId, "active_jobs");
    if (!usage.allowed && (await countActiveJobs(session.companyId)) >= usage.limit) {
      return NextResponse.json({ error: `Your plan allows ${usage.limit} active jobs. Upgrade to publish more.` }, { status: 429 });
    }
  }

  const job = await setJobStatus(session.companyId, id, status);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
