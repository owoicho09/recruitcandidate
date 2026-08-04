import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreRing } from "@/components/ui/score-ring";
import { LoopingVideo } from "@/components/marketing/looping-video";

export function HeroMockup() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="col-span-1 p-4 sm:col-span-2 lg:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground-muted">Employer dashboard</p>
          <StatusChip tone="success" className="text-[10px]">Live</StatusChip>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Active jobs", value: "3" },
            { label: "Applications", value: "128" },
            { label: "Qualified", value: "6" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-surface-muted p-3">
              <p className="text-lg font-semibold text-foreground">{s.value}</p>
              <p className="text-[11px] text-foreground-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold text-foreground-muted">Career page</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">N</div>
          <p className="text-xs font-medium text-foreground">Northwind Labs</p>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="h-2 w-full rounded bg-surface-muted" />
          <div className="h-2 w-3/4 rounded bg-surface-muted" />
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold text-foreground-muted">Candidate scorecard</p>
        <div className="mt-2 flex items-center gap-3">
          <ScoreRing score={87} size={44} />
          <div>
            <p className="text-xs font-semibold text-foreground">Strong match</p>
            <p className="text-[11px] text-foreground-muted">Skills · Experience</p>
          </div>
        </div>
      </Card>

      <Card className="col-span-1 p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-xs font-semibold text-foreground-muted">Video interview</p>
        <div className="mt-2 aspect-video overflow-hidden rounded-md bg-foreground/90">
          <LoopingVideo />
        </div>
      </Card>

      <Card className="col-span-1 p-4 sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-semibold text-foreground-muted">Qualified candidates</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {["Chinedu Okafor", "Fatima Bello"].map((name) => (
            <div key={name} className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-1.5">
              <span className="text-xs font-medium text-foreground">{name}</span>
              <CheckCircle2 className="size-3.5 text-success" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
