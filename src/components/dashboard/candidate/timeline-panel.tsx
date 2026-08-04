import type { ReactNode } from "react";
import { Mail, ArrowRightCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { stageMap, emailStatusMap } from "@/lib/status-maps";
import { formatDateTime } from "@/lib/utils/format";
import type { EmailLog, PipelineEvent } from "@/types/database";

interface TimelineEntry {
  type: "stage" | "email";
  date: string;
  content: ReactNode;
}

export function TimelinePanel({ events, emailLogs }: { events: PipelineEvent[]; emailLogs: EmailLog[] }) {
  const entries: TimelineEntry[] = [
    ...events.map((e) => ({
      type: "stage" as const,
      date: e.created_at,
      content: (
        <span>
          {e.from_stage ? <>Moved from <strong className="text-foreground">{stageMap[e.from_stage].label}</strong> to </> : <>Entered </>}
          <strong className="text-foreground">{stageMap[e.to_stage].label}</strong>
          {e.source === "ai" && <span className="text-foreground-muted"> · automated</span>}
        </span>
      ),
    })),
    ...emailLogs.map((e) => ({
      type: "email" as const,
      date: e.sent_at ?? e.scheduled_for ?? "",
      content: (
        <span>
          Email <strong className="text-foreground">{e.subject}</strong> — {emailStatusMap[e.status].label}
        </span>
      ),
    })),
  ].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  if (entries.length === 0) {
    return <Card className="p-10 text-center text-sm text-foreground-muted">No activity yet.</Card>;
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col">
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                {entry.type === "email" ? <Mail className="size-3.5 text-foreground-muted" /> : <ArrowRightCircle className="size-3.5 text-accent" />}
              </div>
              {i < entries.length - 1 && <div className="w-px flex-1 bg-border" style={{ minHeight: 20 }} />}
            </div>
            <div className="pb-5 text-sm">
              <p className="text-foreground-muted">{entry.content}</p>
              <p className="text-xs text-foreground-muted/70">{formatDateTime(entry.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
