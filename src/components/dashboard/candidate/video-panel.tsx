"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreRing } from "@/components/ui/score-ring";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { VideoInterview, VideoInterviewAttempt, VideoResponse } from "@/types/database";

export function VideoPanel({ videoInterview, attempt, responses }: { videoInterview: VideoInterview | null; attempt: VideoInterviewAttempt | null; responses: VideoResponse[] }) {
  if (!videoInterview) {
    return <Card className="p-10 text-center text-sm text-foreground-muted">No video interview is configured for this role.</Card>;
  }
  if (!attempt) {
    return <Card className="p-10 text-center text-sm text-foreground-muted">Video interview not sent yet.</Card>;
  }
  if (attempt.status !== "completed") {
    return (
      <Card className="p-10 text-center">
        <StatusChip tone="info">{attempt.status === "in_progress" ? "In progress" : "Not started"}</StatusChip>
      </Card>
    );
  }

  const avgScore = responses.length ? Math.round(responses.reduce((s, r) => s + (r.employer_score ?? r.ai_score ?? 0), 0) / responses.length) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-6 p-5">
        <ScoreRing score={avgScore} size={72} label="Overall" />
        <p className="text-sm text-foreground-muted">{responses.length} question{responses.length === 1 ? "" : "s"} answered</p>
      </Card>

      {videoInterview.questions.map((q) => {
        const response = responses.find((r) => r.question_id === q.id);
        return <VideoResponseCard key={q.id} prompt={q.prompt} response={response ?? null} />;
      })}
    </div>
  );
}

function VideoResponseCard({ prompt, response }: { prompt: string; response: VideoResponse | null }) {
  const router = useRouter();
  const toast = useToast();
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function saveScore(score: number) {
    if (!response) return;
    setSaving(true);
    await fetch(`/api/video-interviews/responses/${response.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employerScore: score }) });
    setSaving(false);
    toast.success("Score saved");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-foreground">{prompt}</p>
      {!response ? (
        <p className="mt-2 text-sm text-foreground-muted">No response recorded.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row">
            <div className="flex aspect-video w-full max-w-xs shrink-0 items-center justify-center rounded-lg bg-foreground/90">
              <PlayCircle className="size-8 text-white/80" />
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-3">
                <ScoreRing score={response.employer_score ?? response.ai_score} size={44} />
                <div className="flex gap-1.5">
                  {[40, 60, 75, 90].map((s) => (
                    <button key={s} disabled={saving} onClick={() => saveScore(s)} className="rounded-md border border-border-strong px-2 py-1 text-xs text-foreground-muted hover:border-accent hover:text-accent">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {response.ai_analysis && (
                <div className="flex flex-col gap-1.5 text-xs text-foreground-muted">
                  <p><span className="font-medium text-foreground">Strengths:</span> {response.ai_analysis.strengths.join(", ") || "—"}</p>
                  <p><span className="font-medium text-foreground">Concerns:</span> {response.ai_analysis.concerns.join(", ") || "—"}</p>
                  <p><span className="font-medium text-foreground">AI summary:</span> {response.ai_analysis.summary}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-surface-muted p-3">
            <p className="text-xs font-semibold text-foreground-muted">Transcript</p>
            <p className="mt-1 text-sm text-foreground-muted">{response.transcript}</p>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-foreground-muted">Employer notes</p>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Add a note on this response…" />
          </div>
        </>
      )}
    </Card>
  );
}
