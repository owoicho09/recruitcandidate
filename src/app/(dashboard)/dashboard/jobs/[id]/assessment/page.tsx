import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getJob } from "@/lib/services/jobs";
import { getAssessmentForJob } from "@/lib/services/assessments";
import { AssessmentBuilder } from "@/components/dashboard/assessment-builder";

export const metadata: Metadata = { title: "Assessment" };

export default async function JobAssessmentPage({ params }: PageProps<"/dashboard/jobs/[id]/assessment">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const job = await getJob(session.companyId, id);
  if (!job) notFound();

  const assessment = await getAssessmentForJob(session.companyId, id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Assessment — {job.title}</h1>
        <p className="text-sm text-foreground-muted">Candidates complete this after being shortlisted.</p>
      </div>
      <AssessmentBuilder jobId={id} assessment={assessment} />
    </div>
  );
}
