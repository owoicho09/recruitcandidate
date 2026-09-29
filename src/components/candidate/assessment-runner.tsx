"use client";

import * as React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/input";
import { formatDuration } from "@/lib/utils/format";
import type { Assessment, AssessmentAttempt, Company, Job } from "@/types/database";

export function AssessmentRunner({
  token,
  assessment,
  attempt: initialAttempt,
  job,
  company,
}: {
  token: string;
  assessment: Assessment;
  attempt: AssessmentAttempt;
  job: Job;
  company: Company;
}) {
  const [phase, setPhase] = React.useState<"intro" | "running" | "done">(initialAttempt.status === "completed" ? "done" : "intro");
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>(initialAttempt.answers ?? {});
  const [secondsLeft, setSecondsLeft] = React.useState(assessment.duration_minutes * 60);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const questions = assessment.questions;
  const current = questions[index];

  React.useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  React.useEffect(() => {
    if (phase === "running" && secondsLeft === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  async function begin() {
    const res = await fetch(`/api/assessments/${token}/start`, { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      setSubmitError(res ? "This assessment link has expired or is no longer valid." : "You appear to be offline. Check your connection and try again.");
      return;
    }
    setPhase("running");
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/assessments/${token}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "We couldn't submit your answers. Please try again.");
        return;
      }
      setPhase("done");
    } catch {
      // Answers stay in state, so the candidate can retry once they're back online.
      setSubmitError("You appear to be offline — your answers are kept. Check your connection and press Submit again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "done") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-4 py-20 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h1 className="text-xl font-semibold text-foreground">Assessment submitted</h1>
        <p className="text-sm text-foreground-muted">Thanks for completing the assessment for {job.title} at {company.name}. We&apos;ll be in touch with next steps.</p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{assessment.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{job.title}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-foreground-muted">{assessment.instructions}</p>
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Clock className="size-4" /> {assessment.duration_minutes} minutes · {questions.length} questions · one attempt
            </div>
            <Button size="lg" onClick={begin}>Start assessment</Button>
            {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Question {index + 1} of {questions.length}</p>
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground"><Clock className="size-4" /> {formatDuration(secondsLeft)}</p>
      </div>
      <Progress value={((index + 1) / questions.length) * 100} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="text-base font-medium text-foreground">{current.prompt}</p>
          {current.type === "multiple_choice" ? (
            <div className="flex flex-col gap-2">
              {current.options.map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border-strong p-3 text-sm hover:border-accent/50">
                  <input
                    type="radio"
                    name={current.id}
                    checked={answers[current.id] === opt.id}
                    onChange={() => setAnswers((a) => ({ ...a, [current.id]: opt.id }))}
                    className="accent-[var(--color-accent)]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          ) : (
            <Textarea rows={6} value={(answers[current.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))} placeholder="Type your answer" />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Back</Button>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>Next</Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <Button loading={submitting} onClick={submit}>Submit assessment</Button>
            {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
