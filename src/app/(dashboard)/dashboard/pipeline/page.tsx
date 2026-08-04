import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { listApplicantsForCompany } from "@/lib/services/applications";
import { listMembers } from "@/lib/services/team";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const session = await requireSession();
  const [rows, members] = await Promise.all([listApplicantsForCompany(session.companyId), listMembers(session.companyId)]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
        <p className="text-sm text-foreground-muted">Drag candidates between stages, or open a card for full detail.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No candidates yet" description="Your hiring pipeline will fill up once candidates start applying." />
      ) : (
        <PipelineBoard rows={rows} members={members} />
      )}
    </div>
  );
}
