"use client";

import * as React from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface ChecklistItem {
  label: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({ items, companySlug }: { items: ChecklistItem[]; companySlug: string }) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  const doneCount = items.filter((i) => i.done).length;

  return (
    <Card className="relative p-5">
      <button onClick={() => setDismissed(true)} className="absolute right-4 top-4 rounded-md p-1 text-foreground-muted hover:bg-surface-muted" aria-label="Dismiss">
        <X className="size-4" />
      </button>
      <p className="text-sm font-semibold text-foreground">Get your workspace ready</p>
      <p className="text-xs text-foreground-muted">{doneCount} of {items.length} complete</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              item.done ? "border-border bg-surface-muted text-foreground-muted" : "border-border-strong text-foreground hover:border-accent/50",
            )}
          >
            {item.done ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-foreground-muted" />}
            <span className={item.done ? "line-through" : ""}>{item.label}</span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-foreground-muted">
        Career page: <code className="text-accent">recruitcandidates.com/{companySlug}/careers</code>
      </p>
    </Card>
  );
}
