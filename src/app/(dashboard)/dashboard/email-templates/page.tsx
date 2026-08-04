import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listEmailTemplates } from "@/lib/services/emails";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { EmailTemplateEditor } from "@/components/dashboard/email-template-editor";

export const metadata: Metadata = { title: "Email Templates" };

export default async function EmailTemplatesPage() {
  const session = await requireSession();
  const templates = await listEmailTemplates(session.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Email Templates</h1>
          <p className="text-sm text-foreground-muted">Candidate and employer emails sent throughout the hiring process.</p>
        </div>
        <Link href="/dashboard/email-templates/log" className="text-sm text-accent hover:underline">View email log →</Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft"><Mail className="size-4 text-accent" /></div>
              <div>
                <p className="text-sm font-medium capitalize text-foreground">{t.type.replace(/_/g, " ")}</p>
                <p className="text-xs text-foreground-muted line-clamp-1">{t.subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip tone={t.enabled ? "success" : "neutral"}>{t.enabled ? "Enabled" : "Disabled"}</StatusChip>
              <EmailTemplateEditor template={t} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
