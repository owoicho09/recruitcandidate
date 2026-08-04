import * as React from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-surface-muted text-foreground-muted border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

export type ChipTone = keyof typeof tones;

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  dot?: boolean;
}

export function StatusChip({ tone = "neutral", dot = false, className, children, ...props }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("size-1.5 rounded-full", tone === "neutral" ? "bg-foreground-muted" : "bg-current")} />}
      {children}
    </span>
  );
}
