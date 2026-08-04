import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getQualifiedByRole } from "@/lib/services/qualified";
import { QualifiedCandidates } from "@/components/dashboard/qualified-candidates";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Qualified Candidates" };

export default async function QualifiedPage() {
  const session = await requireSession();
  const groups = await getQualifiedByRole(session.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Qualified Candidates</h1>
        <p className="text-sm text-foreground-muted">Your vetted shortlist, grouped by role.</p>
      </div>
      {groups.length === 0 ? (
        <EmptyState title="No qualified candidates yet" description="Move candidates to Qualified from their profile or the pipeline board." />
      ) : (
        <QualifiedCandidates groups={groups} />
      )}
    </div>
  );
}
