import type { Metadata } from "next";
import Link from "next/link";
import { listCompaniesForAdmin } from "@/lib/services/platform-admin";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { subscriptionStatusMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Platform Admin — Companies" };

export default async function PlatformAdminCompaniesPage() {
  const rows = await listCompaniesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Companies</h1>
        <p className="text-sm text-foreground-muted">{rows.length} companies</p>
      </div>
      <Table>
        <TableHead>
          <tr>
            <TableHeadCell>Company</TableHeadCell>
            <TableHeadCell>Owner</TableHeadCell>
            <TableHeadCell>Plan</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Applications used</TableHeadCell>
            <TableHeadCell>Created</TableHeadCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map(({ company, subscription, plan, owner, usage }) => (
            <TableRow key={company.id} interactive>
              <TableCell>
                <Link href={`/platform-admin/companies/${company.id}`} className="font-medium text-foreground hover:text-accent">{company.name}</Link>
                <p className="text-xs text-foreground-muted">{company.slug}</p>
              </TableCell>
              <TableCell className="text-foreground-muted">{owner?.full_name ?? "—"}</TableCell>
              <TableCell className="text-foreground-muted">{plan?.name ?? "—"}</TableCell>
              <TableCell>{subscription && <StatusChip tone={subscriptionStatusMap[subscription.status].tone}>{subscriptionStatusMap[subscription.status].label}</StatusChip>}</TableCell>
              <TableCell className="text-foreground-muted">{usage ? `${usage.applications} / ${plan?.limits.applications ?? "—"}` : "—"}</TableCell>
              <TableCell className="text-foreground-muted">{formatDate(company.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
