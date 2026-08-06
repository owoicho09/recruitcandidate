import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { setJobStatus, listJobs } from "@/lib/services/jobs";
import { checkUsage } from "@/lib/services/usage-tracking";
import { trackLifecycleEvent, recomputeLifecycleSegment } from "@/lib/services/lifecycle";

const VALID = ["draft", "published", "paused", "closed", "archived"] as const;

export async function POST(request: Request, { params }: RouteContext<"/api/jobs/[id]/status">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (!VALID.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  if (status === "published") {
    const usage = await checkUsage(session.companyId, "active_jobs");
    if (!usage.allowed) {
      if (usage.reason === "No active subscription" || usage.reason === "Subscription is not active") {
        return NextResponse.json(
          { error: "Your job is ready to publish. Choose a plan to start receiving applications.", requiresPlan: true },
          { status: 402 },
        );
      }
      return NextResponse.json({ error: `Your plan allows ${usage.limit} active jobs. Upgrade or buy more jobs to publish more.` }, { status: 429 });
    }
  }

  const wasFirstPublish = status === "published" && !(await listJobs(session.companyId)).some((j) => j.status === "published");
  const job = await setJobStatus(session.companyId, id, status);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (wasFirstPublish) await trackLifecycleEvent(session.companyId, "first_job_published", session.userId);
  else await recomputeLifecycleSegment(session.companyId);

  return NextResponse.json({ job });
}
