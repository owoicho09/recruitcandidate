"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/components/ui/toast";
import type { TeamInvitation } from "@/types/database";

export function InvitationRow({ invitation }: { invitation: TeamInvitation }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function revoke() {
    setBusy(true);
    const res = await fetch(`/api/team/invitations/${invitation.id}/revoke`, { method: "POST" });
    if (res.ok) { toast.success("Invitation revoked"); router.refresh(); }
    else setBusy(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{invitation.email}</p>
        <p className="text-xs text-foreground-muted capitalize">{invitation.role.replace("_", " ")} · pending</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusChip tone="neutral">Invited</StatusChip>
        <button onClick={revoke} disabled={busy} className="rounded-md p-2 text-foreground-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50" aria-label="Revoke invitation">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        </button>
      </div>
    </div>
  );
}
