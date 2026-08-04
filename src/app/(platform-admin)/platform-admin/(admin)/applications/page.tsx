import type { Metadata } from "next";
import Link from "next/link";
import { listApplicationsForAdmin } from "@/lib/services/platform-admin";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { stageMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Platform Admin — Applications" };

export default async function PlatformAdminApplicationsPage() {
  const rows = await listApplicationsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Applications</h1>
        <p className="text-sm text-foreground-muted">{rows.length} applications across all companies</p>
      </div>
      <Table>
        <TableHead><tr><TableHeadCell>Candidate</TableHeadCell><TableHeadCell>Company</TableHeadCell><TableHeadCell>Stage</TableHeadCell><TableHeadCell>Applied</TableHeadCell></tr></TableHead>
        <TableBody>
          {rows.slice(0, 100).map(({ application, company, candidate }) => (
            <TableRow key={application.id} interactive>
              <TableCell className="font-medium text-foreground">{candidate.first_name} {candidate.last_name}</TableCell>
              <TableCell><Link href={`/platform-admin/companies/${company.id}`} className="text-foreground-muted hover:text-accent">{company.name}</Link></TableCell>
              <TableCell><StatusChip tone={stageMap[application.stage].tone}>{stageMap[application.stage].label}</StatusChip></TableCell>
              <TableCell className="text-foreground-muted">{formatDate(application.applied_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
