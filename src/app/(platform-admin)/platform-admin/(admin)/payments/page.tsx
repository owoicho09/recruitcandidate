import type { Metadata } from "next";
import Link from "next/link";
import { listPaymentsForAdmin } from "@/lib/services/platform-admin";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Platform Admin — Payments" };

export default async function PlatformAdminPaymentsPage() {
  const rows = await listPaymentsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-foreground-muted">{rows.length} transactions</p>
      </div>
      <Table>
        <TableHead><tr><TableHeadCell>Company</TableHeadCell><TableHeadCell>Amount</TableHeadCell><TableHeadCell>Status</TableHeadCell><TableHeadCell>Reference</TableHeadCell><TableHeadCell>Date</TableHeadCell></tr></TableHead>
        <TableBody>
          {rows.map(({ payment, company }) => (
            <TableRow key={payment.id} interactive>
              <TableCell><Link href={`/platform-admin/companies/${company.id}`} className="font-medium text-foreground hover:text-accent">{company.name}</Link></TableCell>
              <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
              <TableCell><StatusChip tone={payment.status === "success" ? "success" : "danger"}>{payment.status}</StatusChip></TableCell>
              <TableCell className="text-foreground-muted">{payment.paystack_reference}</TableCell>
              <TableCell className="text-foreground-muted">{payment.paid_at ? formatDate(payment.paid_at) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
