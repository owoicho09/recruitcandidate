import type { Metadata } from "next";
import Link from "next/link";
import { listSubscriptionsForAdmin } from "@/lib/services/platform-admin";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { subscriptionStatusMap } from "@/lib/status-maps";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Platform Admin — Subscriptions" };

const GROUPS = [
  { key: "active", label: "Active", statuses: ["active"] },
  { key: "attention", label: "Attention / past due", statuses: ["attention", "past_due"] },
  { key: "non_renewing", label: "Non-renewing", statuses: ["non_renewing"] },
  { key: "canceled", label: "Canceled", statuses: ["canceled"] },
] as const;

export default async function PlatformAdminSubscriptionsPage() {
  const rows = await listSubscriptionsForAdmin();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Subscriptions</h1>
        <p className="text-sm text-foreground-muted">{rows.length} total subscriptions</p>
      </div>
      {GROUPS.map((group) => {
        const groupRows = rows.filter((r) => (group.statuses as readonly string[]).includes(r.subscription.status));
        if (groupRows.length === 0) return null;
        return (
          <div key={group.key} className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">{group.label} ({groupRows.length})</p>
            <Table>
              <TableHead><tr><TableHeadCell>Company</TableHeadCell><TableHeadCell>Plan</TableHeadCell><TableHeadCell>Status</TableHeadCell><TableHeadCell>Period end</TableHeadCell></tr></TableHead>
              <TableBody>
                {groupRows.map(({ subscription, company, plan }) => (
                  <TableRow key={subscription.id} interactive>
                    <TableCell><Link href={`/platform-admin/companies/${company.id}`} className="font-medium text-foreground hover:text-accent">{company.name}</Link></TableCell>
                    <TableCell className="text-foreground-muted">{plan ? `${plan.name} — ${formatCurrency(plan.amount, plan.currency)}/mo` : "—"}</TableCell>
                    <TableCell><StatusChip tone={subscriptionStatusMap[subscription.status].tone}>{subscriptionStatusMap[subscription.status].label}</StatusChip></TableCell>
                    <TableCell className="text-foreground-muted">{formatDate(subscription.period_end)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
