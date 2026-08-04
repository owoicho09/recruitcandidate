"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatusChip } from "@/components/ui/status-chip";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { recommendationMap, reviewStateMap } from "@/lib/status-maps";
import type { AiScreeningResult } from "@/types/database";

export function ScreeningPanel({ screening }: { screening: AiScreeningResult | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  if (!screening) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <Sparkles className="size-6 text-foreground-muted" />
        <p className="text-sm font-medium text-foreground">Screening not run yet</p>
        <p className="text-sm text-foreground-muted">This application hasn&apos;t been screened. It will run automatically shortly after submission.</p>
      </Card>
    );
  }

  async function setOverride(value: string) {
    setBusy(true);
    const res = await fetch(`/api/screening/${screening!.id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation: value === "clear" ? null : value }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Override saved");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing score={screening.overall_score} size={72} label="Overall" />
          <div className="flex flex-1 flex-col gap-2 min-w-[200px]">
            <ScoreBar label="Skills match" value={screening.skills_match} />
            <ScoreBar label="Experience match" value={screening.experience_match} />
            {screening.education_match !== null && <ScoreBar label="Education relevance" value={screening.education_match} />}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusChip tone={recommendationMap[screening.recommendation].tone}>{recommendationMap[screening.recommendation].label}</StatusChip>
            <StatusChip tone={reviewStateMap[screening.review_state].tone}>{reviewStateMap[screening.review_state].label}</StatusChip>
          </div>
        </div>
        <p className="mt-2 text-xs text-foreground-muted">Screening scores assist review — they do not make final decisions.</p>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-foreground">Explanation</p>
        <p className="mt-1.5 text-sm text-foreground-muted">{screening.explanation}</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Strengths</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {screening.strengths.map((s) => <li key={s} className="flex items-start gap-1.5 text-sm text-foreground-muted"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> {s}</li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Concerns</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {screening.concerns.length === 0 && <li className="text-sm text-foreground-muted">None flagged</li>}
            {screening.concerns.map((s) => <li key={s} className="flex items-start gap-1.5 text-sm text-foreground-muted"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> {s}</li>)}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Matched requirements</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{screening.matched_requirements.map((s) => <StatusChip key={s} tone="success">{s}</StatusChip>)}</div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Missing requirements</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {screening.missing_minimum_requirements.map((s) => <StatusChip key={s} tone="danger">{s} (minimum)</StatusChip>)}
            {screening.missing_preferred_requirements.map((s) => <StatusChip key={s} tone="warning">{s} (preferred)</StatusChip>)}
            {screening.missing_minimum_requirements.length === 0 && screening.missing_preferred_requirements.length === 0 && <span className="text-sm text-foreground-muted">None</span>}
          </div>
        </Card>
      </div>

      {screening.uncertainty_notes.length > 0 && (
        <Card className="border-warning/30 p-5">
          <p className="text-sm font-semibold text-foreground">Uncertainty notes</p>
          <ul className="mt-2 flex flex-col gap-1">
            {screening.uncertainty_notes.map((s) => <li key={s} className="text-sm text-foreground-muted">{s}</li>)}
          </ul>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Manual override</p>
          <p className="text-xs text-foreground-muted">Recruiter judgement takes precedence over the AI recommendation.</p>
        </div>
        <Select value={screening.manual_override ?? "clear"} onValueChange={setOverride} disabled={busy}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="clear">No override</SelectItem>
            <SelectItem value="strong_match">Override: Strong match</SelectItem>
            <SelectItem value="possible_match">Override: Possible match</SelectItem>
            <SelectItem value="manual_review">Override: Needs manual review</SelectItem>
            <SelectItem value="low_match">Override: Low match</SelectItem>
          </SelectContent>
        </Select>
      </Card>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
