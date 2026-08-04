import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreRing } from "@/components/ui/score-ring";
import { stageMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";
import type { ApplicantRow } from "@/lib/services/applications";

export function ApplicantCard({ row }: { row: ApplicantRow }) {
  const { application, candidate, jobTitle, cvScore } = row;

  return (
    <Link href={`/dashboard/applicants/${application.id}`}>
      <Card className="flex flex-col gap-3 p-4 transition-colors hover:border-accent/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Avatar name={`${candidate.first_name} ${candidate.last_name}`} />
            <div>
              <p className="text-sm font-semibold text-foreground">{candidate.first_name} {candidate.last_name}</p>
              <p className="text-xs text-foreground-muted">{jobTitle}</p>
            </div>
          </div>
          {cvScore !== null && <ScoreRing score={cvScore} size={40} />}
        </div>
        <div className="flex items-center justify-between">
          <StatusChip tone={stageMap[application.stage].tone}>{stageMap[application.stage].label}</StatusChip>
          <span className="text-xs text-foreground-muted">{formatDate(application.applied_at)}</span>
        </div>
      </Card>
    </Link>
  );
}
