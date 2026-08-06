import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { jobSchema } from "@/lib/validation/job";
import { createJob, listJobs } from "@/lib/services/jobs";
import { trackLifecycleEvent, recomputeLifecycleSegment } from "@/lib/services/lifecycle";

/**
 * Deliberately not gated on having an active plan — accounts can draft a job
 * (and see the full form) for free. The paywall sits at publish time instead
 * (see /api/jobs/[id]/status), once they've already invested effort building
 * the role and actually want it live.
 */
export async function POST(request: Request) {
  const session = await requireSession("recruiter");

  const body = await request.json().catch(() => null);
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const isFirstJob = (await listJobs(session.companyId)).length === 0;
  const job = await createJob(session.companyId, session.userId, { ...parsed.data, salary_min: parsed.data.salary_min ?? null, salary_max: parsed.data.salary_max ?? null, min_experience: parsed.data.min_experience ?? null, education_requirements: parsed.data.education_requirements ?? null, closing_date: parsed.data.closing_date ?? null });

  if (isFirstJob) await trackLifecycleEvent(session.companyId, "first_draft_job_created", session.userId);
  else await recomputeLifecycleSegment(session.companyId);

  return NextResponse.json({ job });
}
