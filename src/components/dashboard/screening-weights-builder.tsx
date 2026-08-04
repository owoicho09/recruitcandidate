"use client";

import { Controller, type Control } from "react-hook-form";
import { cn } from "@/lib/cn";
import type { JobFormInput } from "@/lib/validation/job";

const LABELS: Record<keyof JobFormInput["screening_weights"], string> = {
  required_skills: "Required skills",
  relevant_experience: "Relevant experience",
  transferable_experience: "Transferable experience",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  application_answers: "Application answers",
};

type WeightsKey = keyof JobFormInput["screening_weights"];

export function ScreeningWeightsBuilder({ control, weights }: { control: Control<JobFormInput>; weights: Record<WeightsKey, number> }) {
  const total = Object.values(weights ?? {}).reduce((a: number, b) => a + (Number(b) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-foreground-muted">
        Weight how much each factor contributes to the overall screening score. This assists review — it never makes the final decision.
      </p>
      {(Object.keys(LABELS) as (keyof JobFormInput["screening_weights"])[]).map((key) => (
        <div key={key} className="flex items-center gap-4">
          <label className="w-44 shrink-0 text-sm text-foreground">{LABELS[key]}</label>
          <Controller
            name={`screening_weights.${key}`}
            control={control}
            render={({ field }) => (
              <input
                type="range"
                min={0}
                max={100}
                value={Number(field.value) || 0}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="h-1.5 flex-1 accent-[var(--color-accent)]"
              />
            )}
          />
          <span className="w-10 text-right text-sm tabular-nums text-foreground-muted">{weights?.[key] ?? 0}%</span>
        </div>
      ))}
      <div className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium", total === 100 ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
        <span>Total</span>
        <span>{total}%{total !== 100 && " — must equal 100%"}</span>
      </div>
    </div>
  );
}
