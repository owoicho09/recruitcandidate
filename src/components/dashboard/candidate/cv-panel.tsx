import { FileText, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { cvParseStatusMap } from "@/lib/status-maps";
import type { Application } from "@/types/database";

export function CvPanel({ application }: { application: Application }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft">
            <FileText className="size-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{application.cv_filename}</p>
            <StatusChip tone={cvParseStatusMap[application.cv_parse_status].tone} className="mt-1">{cvParseStatusMap[application.cv_parse_status].label}</StatusChip>
          </div>
        </div>
        <Button variant="secondary" size="sm" disabled><Download className="size-4" /> Download</Button>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-foreground">Extracted text</p>
        {application.cv_text ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-muted">{application.cv_text}</p>
        ) : (
          <p className="mt-2 text-sm text-foreground-muted">
            {application.cv_parse_status === "unreadable" ? "This CV could not be read automatically — review the original file manually." : "Extraction in progress…"}
          </p>
        )}
      </Card>
      <p className="text-xs text-foreground-muted">
        Files are stored privately and served through time-limited signed URLs — download is disabled in demo mode.
      </p>
    </div>
  );
}
