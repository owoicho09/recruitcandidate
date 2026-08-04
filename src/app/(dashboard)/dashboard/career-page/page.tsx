import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getCompany } from "@/lib/services/companies";
import { listJobs } from "@/lib/services/jobs";
import { CareerPageEditor } from "@/components/dashboard/career-page-editor";
import { PermissionDeniedState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Career Page" };

export default async function CareerPageSettingsPage() {
  const session = await requireSession();
  if (session.role === "reviewer" || session.role === "hiring_manager") {
    return <PermissionDeniedState description="Only owners, admins, and recruiters can edit the career page." />;
  }

  const [company, jobs] = await Promise.all([getCompany(session.companyId), listJobs(session.companyId)]);
  if (!company) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Career Page</h1>
        <p className="text-sm text-foreground-muted">Control what candidates see before they apply.</p>
      </div>
      <CareerPageEditor company={company} jobs={jobs.filter((j) => j.status === "published")} />
    </div>
  );
}
