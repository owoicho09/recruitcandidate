import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSystemHealth } from "@/lib/services/platform-admin";
import { Card } from "@/components/ui/card";
import { flags, DEMO_MODE } from "@/lib/env";
import { StatusChip } from "@/components/ui/status-chip";

export const metadata: Metadata = { title: "Platform Admin — System" };

export default async function PlatformAdminSystemPage() {
  const health = await getSystemHealth();

  const rows = [
    { label: "Failed CV parsing", value: health.failedCvParsing },
    { label: "Unreadable CVs (flagged for manual review)", value: health.unreadableCvs },
    { label: "Failed AI screening", value: health.failedScreening },
    { label: "Failed transcription", value: health.failedTranscription },
    { label: "Failed email delivery", value: health.failedEmail },
    { label: "Failed webhook processing", value: health.failedWebhooks },
  ];

  const integrations = [
    { label: "Supabase (database & storage)", ok: flags.hasSupabase },
    { label: "Claude (screening & interview analysis)", ok: flags.hasClaude },
    { label: "Resend (email)", ok: flags.hasResend },
    { label: "Paystack (billing)", ok: flags.hasPaystack },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">System Health</h1>
        <p className="text-sm text-foreground-muted">{DEMO_MODE ? "Running in demo mode — integrations below are stubbed." : "Live integration status."}</p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Integrations</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {integrations.map((i) => (
            <div key={i.label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <span className="text-sm text-foreground">{i.label}</span>
              <StatusChip tone={i.ok ? "success" : "neutral"}>{i.ok ? "Connected" : "Demo mode"}</StatusChip>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Processing errors</p>
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-foreground">
                {r.value > 0 ? <AlertTriangle className="size-4 text-warning" /> : <CheckCircle2 className="size-4 text-success" />}
                {r.label}
              </span>
              <span className="text-sm font-semibold text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
