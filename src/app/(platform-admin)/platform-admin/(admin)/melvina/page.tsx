import type { Metadata } from "next";
import { listMelvinaMessagesForAdmin } from "@/lib/services/melvina-log";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Platform Admin — Melvina chats" };

export default async function PlatformAdminMelvinaPage() {
  const rows = await listMelvinaMessagesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Melvina chats</h1>
        <p className="text-sm text-foreground-muted">
          What people actually ask Melvina, across every workspace — most recent {rows.length} turns.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground-muted">No conversations logged yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ message, company }) => (
            <div key={message.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusChip tone={message.role === "user" ? "info" : "accent"}>{message.role === "user" ? "Candidate/user asked" : "Melvina replied"}</StatusChip>
                  <span className="text-xs text-foreground-muted">{company?.name ?? "Unknown company"}</span>
                </div>
                <span className="text-xs text-foreground-muted">{formatDate(message.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
