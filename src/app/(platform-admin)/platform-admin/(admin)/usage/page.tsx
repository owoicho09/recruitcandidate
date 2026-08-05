import type { Metadata } from "next";
import Link from "next/link";
import { listCompaniesForAdmin } from "@/lib/services/platform-admin";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "Platform Admin — Usage" };

export default async function PlatformAdminUsagePage() {
  const rows = await listCompaniesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Usage</h1>
        <p className="text-sm text-foreground-muted">Application usage against plan limits, by company.</p>
      </div>
      <Table>
        <TableHead><tr><TableHeadCell>Company</TableHeadCell><TableHeadCell>Plan</TableHeadCell><TableHeadCell>Applications</TableHeadCell><TableHeadCell>Live AI credits</TableHeadCell></tr></TableHead>
        <TableBody>
          {rows.map(({ company, plan, usage }) => {
            const appPct = usage && plan ? Math.min(100, Math.round((usage.applications / plan.limits.applications) * 100)) : 0;
            return (
              <TableRow key={company.id} interactive>
                <TableCell><Link href={`/platform-admin/companies/${company.id}`} className="font-medium text-foreground hover:text-accent">{company.name}</Link></TableCell>
                <TableCell className="text-foreground-muted">{plan?.name ?? "—"}</TableCell>
                <TableCell className="w-48">
                  <p className="text-xs text-foreground-muted">{usage?.applications ?? 0} / {plan?.limits.applications ?? "—"}</p>
                  <Progress value={appPct} tone={appPct > 90 ? "danger" : appPct > 70 ? "warning" : "accent"} className="mt-1" />
                </TableCell>
                <TableCell className="text-foreground-muted">{usage?.live_ai_interview_credits ?? 0}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
