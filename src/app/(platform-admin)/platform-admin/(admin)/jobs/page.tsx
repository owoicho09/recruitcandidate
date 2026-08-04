import type { Metadata } from "next";
import Link from "next/link";
import { listJobsForAdmin } from "@/lib/services/platform-admin";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { jobStatusMap } from "@/lib/status-maps";

export const metadata: Metadata = { title: "Platform Admin — Jobs" };

export default async function PlatformAdminJobsPage() {
  const rows = await listJobsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
        <p className="text-sm text-foreground-muted">{rows.length} jobs across all companies</p>
      </div>
      <Table>
        <TableHead><tr><TableHeadCell>Title</TableHeadCell><TableHeadCell>Company</TableHeadCell><TableHeadCell>Status</TableHeadCell><TableHeadCell>Department</TableHeadCell></tr></TableHead>
        <TableBody>
          {rows.map(({ job, company }) => (
            <TableRow key={job.id} interactive>
              <TableCell className="font-medium text-foreground">{job.title}</TableCell>
              <TableCell><Link href={`/platform-admin/companies/${company.id}`} className="text-foreground-muted hover:text-accent">{company.name}</Link></TableCell>
              <TableCell><StatusChip tone={jobStatusMap[job.status].tone}>{jobStatusMap[job.status].label}</StatusChip></TableCell>
              <TableCell className="text-foreground-muted">{job.department}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
