import type { Metadata } from "next";
import { getApplicationByTrackingToken } from "@/lib/services/applications";
import { ErrorState } from "@/components/ui/states";
import { StatusChip } from "@/components/ui/status-chip";
import { stageMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";
import { CheckCircle2, Circle } from "lucide-react";
import type { ApplicationStage } from "@/types/database";

export const metadata: Metadata = { title: "Track your application" };

const TRACK_STAGES: ApplicationStage[] = ["applied", "cv_screened", "shortlisted", "assessment", "video_interview", "qualified"];

export default async function TrackApplicationPage({ params }: PageProps<"/application/track/[token]">) {
  const { token } = await params;
  const result = await getApplicationByTrackingToken(token);

  if (!result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <ErrorState title="Application not found" description="This tracking link is invalid or has expired." />
      </div>
    );
  }

  const { application, candidate, job, company } = result;
  const isTerminal = application.stage === "rejected" || application.stage === "on_hold" || application.stage === "withdrawn";
  const currentIndex = TRACK_STAGES.indexOf(application.stage);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{company.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{job.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">Application from {candidate.first_name} {candidate.last_name} · Applied {formatDate(application.applied_at)}</p>
      </div>

      {isTerminal ? (
        <div className="flex justify-center">
          <StatusChip tone={stageMap[application.stage].tone} className="text-sm">{stageMap[application.stage].label}</StatusChip>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {TRACK_STAGES.map((stage, i) => (
            <div key={stage} className="flex gap-3">
              <div className="flex flex-col items-center">
                {i <= currentIndex ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-border-strong" />}
                {i < TRACK_STAGES.length - 1 && <div className={`w-px flex-1 ${i < currentIndex ? "bg-success" : "bg-border"}`} style={{ minHeight: 24 }} />}
              </div>
              <p className={`pb-6 text-sm ${i <= currentIndex ? "font-medium text-foreground" : "text-foreground-muted"}`}>{stageMap[stage].label}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-foreground-muted">
        We&apos;ll email you at each step. Questions? Reply to any of our emails.
      </p>
    </div>
  );
}
