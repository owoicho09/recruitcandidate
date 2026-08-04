import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getJob } from "@/lib/services/jobs";
import { listApplicantsForJob } from "@/lib/services/applications";
import { ApplicantsTable } from "@/components/dashboard/applicants-table";

export const metadata: Metadata = { title: "Job Applicants" };

export default async function JobApplicantsPage({ params }: PageProps<"/dashboard/jobs/[id]/applicants">) {
  const session = await requireSession();
  const { id } = await params;
  const job = await getJob(session.companyId, id);
  if (!job) notFound();

  const rows = await listApplicantsForJob(session.companyId, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Applicants — {job.title}</h1>
        <p className="text-sm text-foreground-muted">{rows.length} applicants</p>
      </div>
      <ApplicantsTable rows={rows} showJobColumn={false} />
    </div>
  );
}
