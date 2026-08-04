import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { listApplicantsForCompany } from "@/lib/services/applications";
import { listJobs } from "@/lib/services/jobs";
import { listMembers } from "@/lib/services/team";
import { ApplicantsExplorer } from "@/components/dashboard/applicants-explorer";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Applicants" };

export default async function ApplicantsPage() {
  const session = await requireSession();
  const [rows, jobs, members] = await Promise.all([
    listApplicantsForCompany(session.companyId),
    listJobs(session.companyId),
    listMembers(session.companyId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Applicants</h1>
        <p className="text-sm text-foreground-muted">{rows.length} total applicants across all roles</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No applicants yet" description="Applications will appear here once candidates start applying to your published roles." />
      ) : (
        <ApplicantsExplorer rows={rows} jobs={jobs} members={members} />
      )}
    </div>
  );
}
