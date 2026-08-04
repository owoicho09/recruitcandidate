"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreRing } from "@/components/ui/score-ring";
import { CheckCircle2 } from "lucide-react";
import { LoopingVideo } from "@/components/marketing/looping-video";

const panels = [
  { value: "dashboard", label: "Employer dashboard", description: "Active jobs, applications, screening queue, and usage — all in one overview." },
  { value: "career-page", label: "Career page", description: "A branded, public page for every open role, hosted for you." },
  { value: "job-creation", label: "Job creation", description: "Requirements, screening weights, and application questions in one form." },
  { value: "application", label: "Application", description: "A simple, no-account-required flow for candidates." },
  { value: "screening", label: "Screening report", description: "Scores plus a plain-language explanation for every candidate." },
  { value: "video", label: "Video interview", description: "Playback, transcript, and question-level scoring side by side." },
  { value: "qualified", label: "Qualified candidates", description: "The final, reviewable shortlist for each role." },
];

export function DemoShowcase() {
  return (
    <Tabs defaultValue="dashboard" className="flex flex-col items-center gap-8">
      <TabsList className="flex-wrap justify-center">
        {panels.map((p) => (
          <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
        ))}
      </TabsList>

      {panels.map((p) => (
        <TabsContent key={p.value} value={p.value} className="w-full">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <p className="text-sm text-foreground-muted">{p.description}</p>
            <DemoPanel value={p.value} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DemoPanel({ value }: { value: string }) {
  if (value === "dashboard") {
    return (
      <Card className="w-full p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Active jobs", "3"], ["Applications", "128"], ["Awaiting review", "9"], ["Qualified", "6"]].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-muted p-4">
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-foreground-muted">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (value === "career-page") {
    return (
      <Card className="w-full overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-accent to-accent-hover" />
        <div className="flex flex-col gap-2 p-6 text-left">
          {["Senior Backend Engineer", "Product Designer", "Customer Success Manager"].map((t) => (
            <div key={t} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <span className="text-sm font-medium text-foreground">{t}</span>
              <StatusChip tone="success">Published</StatusChip>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (value === "job-creation") {
    return (
      <Card className="w-full p-6 text-left">
        <div className="flex flex-col gap-3">
          {["Title & department", "Required & preferred skills", "Screening weights (must total 100%)", "Application questions"].map((f) => (
            <div key={f} className="rounded-lg border border-border-strong px-4 py-3 text-sm text-foreground-muted">{f}</div>
          ))}
        </div>
      </Card>
    );
  }
  if (value === "application") {
    return (
      <Card className="w-full p-6 text-left">
        <div className="grid grid-cols-2 gap-3">
          {["First name", "Last name", "Email", "Phone", "CV upload", "Cover note"].map((f) => (
            <div key={f} className="rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-foreground-muted">{f}</div>
          ))}
        </div>
      </Card>
    );
  }
  if (value === "screening") {
    return (
      <Card className="w-full p-6">
        <div className="flex items-center gap-5">
          <ScoreRing score={87} label="Overall" />
          <div className="flex-1 text-left text-sm text-foreground-muted">
            Strong alignment with core requirements — direct evidence of distributed systems ownership and
            relevant financial-systems experience.
          </div>
        </div>
      </Card>
    );
  }
  if (value === "video") {
    return (
      <Card className="w-full p-6">
        <div className="aspect-video overflow-hidden rounded-lg bg-foreground/90">
          <LoopingVideo />
        </div>
        <p className="mt-3 text-left text-xs text-foreground-muted">
          Transcript: &ldquo;I led the response to a reconciliation drift incident by first isolating the
          affected ledger shard...&rdquo;
        </p>
      </Card>
    );
  }
  return (
    <Card className="w-full p-6 text-left">
      <div className="flex flex-col gap-2">
        {["Chinedu Okafor", "Fatima Bello"].map((name) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-2.5">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <CheckCircle2 className="size-4 text-success" />
          </div>
        ))}
      </div>
    </Card>
  );
}
