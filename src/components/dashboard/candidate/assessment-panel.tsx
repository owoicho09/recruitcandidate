import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreRing } from "@/components/ui/score-ring";
import { formatDate, formatDuration } from "@/lib/utils/format";
import type { Assessment, AssessmentAttempt } from "@/types/database";

export function AssessmentPanel({ assessment, attempt }: { assessment: Assessment | null; attempt: AssessmentAttempt | null }) {
  if (!assessment) {
    return <Card className="p-10 text-center text-sm text-foreground-muted">No assessment is configured for this role.</Card>;
  }
  if (!attempt) {
    return <Card className="p-10 text-center text-sm text-foreground-muted">Assessment not sent yet.</Card>;
  }
  if (attempt.status !== "completed") {
    return (
      <Card className="p-10 text-center">
        <StatusChip tone="info">{attempt.status === "in_progress" ? "In progress" : "Not started"}</StatusChip>
        <p className="mt-2 text-sm text-foreground-muted">Expires {formatDate(attempt.expires_at)}</p>
      </Card>
    );
  }

  const duration = attempt.started_at && attempt.completed_at ? (new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / 1000 : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-6 p-5">
        <ScoreRing score={attempt.score} size={72} label="Score" />
        <div className="flex flex-col gap-1 text-sm text-foreground-muted">
          <span>Pass mark: {assessment.pass_mark}%</span>
          {duration !== null && <span>Completion time: {formatDuration(duration)}</span>}
          <span>Completed {attempt.completed_at ? formatDate(attempt.completed_at) : "—"}</span>
        </div>
        <StatusChip tone={attempt.passed ? "success" : "danger"} className="ml-auto">{attempt.passed ? "Passed" : "Did not pass"}</StatusChip>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-foreground">Section scores</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {Object.entries(attempt.section_scores).map(([section, score]) => (
            <div key={section} className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">{section}</span>
              <span className="font-medium text-foreground">{score}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-foreground">Question-by-question</p>
        <div className="mt-3 flex flex-col gap-3">
          {assessment.questions.map((q) => {
            const given = attempt.answers[q.id];
            const isCorrect = q.type === "multiple_choice" && q.correct_answer && Array.isArray(given) === false
              ? q.correct_answer.includes(given as string)
              : null;
            return (
              <div key={q.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground">{q.prompt}</p>
                  {isCorrect !== null && (isCorrect ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <XCircle className="size-4 shrink-0 text-danger" />)}
                </div>
                <p className="mt-1.5 text-sm text-foreground-muted">
                  {q.type === "multiple_choice" ? q.options.find((o) => o.id === given)?.label ?? "No answer" : String(given ?? "No answer")}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
