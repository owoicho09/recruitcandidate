import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { jobSchema } from "@/lib/validation/job";
import { createJob } from "@/lib/services/jobs";
import { hasActiveSubscription } from "@/lib/services/plan-access";

export async function POST(request: Request) {
  const session = await requireSession("recruiter");

  // Accounts can explore the dashboard freely, but job creation is the one
  // action gated on actually having a plan — everything else (usage limits)
  // only matters once you're past this point.
  if (!(await hasActiveSubscription(session.companyId))) {
    return NextResponse.json({ error: "Choose a plan to start creating jobs.", requiresPlan: true }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const job = await createJob(session.companyId, session.userId, { ...parsed.data, salary_min: parsed.data.salary_min ?? null, salary_max: parsed.data.salary_max ?? null, min_experience: parsed.data.min_experience ?? null, education_requirements: parsed.data.education_requirements ?? null, closing_date: parsed.data.closing_date ?? null });
  return NextResponse.json({ job });
}
