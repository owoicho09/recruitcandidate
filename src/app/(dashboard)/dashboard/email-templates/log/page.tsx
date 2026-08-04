import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { listEmailLogs } from "@/lib/services/emails";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/states";
import { emailStatusMap } from "@/lib/status-maps";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Email Log" };

export default async function EmailLogPage() {
  const session = await requireSession();
  const logs = await listEmailLogs(session.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Email Log</h1>
        <p className="text-sm text-foreground-muted">Every candidate and employer email sent from your workspace.</p>
      </div>
      {logs.length === 0 ? (
        <EmptyState title="No emails sent yet" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Recipient</TableHeadCell>
              <TableHeadCell>Type</TableHeadCell>
              <TableHeadCell>Subject</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Sent</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-foreground-muted">{log.recipient}</TableCell>
                <TableCell className="capitalize text-foreground-muted">{log.type.replace(/_/g, " ")}</TableCell>
                <TableCell className="max-w-xs truncate text-foreground">{log.subject}</TableCell>
                <TableCell><StatusChip tone={emailStatusMap[log.status].tone}>{emailStatusMap[log.status].label}</StatusChip></TableCell>
                <TableCell className="text-foreground-muted">{log.sent_at ? formatDateTime(log.sent_at) : log.scheduled_for ? `Scheduled ${formatDateTime(log.scheduled_for)}` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
