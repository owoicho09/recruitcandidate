import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listJobs } from "@/lib/services/jobs";
import { listApplicantsForCompany } from "@/lib/services/applications";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/states";
import { jobStatusMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";
import { JobActionsMenu } from "@/components/dashboard/job-actions-menu";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  const session = await requireSession();
  const [jobs, applicants] = await Promise.all([listJobs(session.companyId), listApplicantsForCompany(session.companyId)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
          <p className="text-sm text-foreground-muted">{jobs.length} total roles</p>
        </div>
        <Button href="/dashboard/jobs/new"><Plus className="size-4" /> Create job</Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet" description="Create your first role to start receiving applications." action={{ label: "Create job", href: "/dashboard/jobs/new" }} />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Title</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Department</TableHeadCell>
              <TableHeadCell>Location</TableHeadCell>
              <TableHeadCell>Applications</TableHeadCell>
              <TableHeadCell>Shortlisted</TableHeadCell>
              <TableHeadCell>Qualified</TableHeadCell>
              <TableHeadCell>Closing date</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {jobs.map((job) => {
              const jobApplicants = applicants.filter((a) => a.application.job_id === job.id);
              return (
                <TableRow key={job.id} interactive>
                  <TableCell>
                    <Link href={`/dashboard/jobs/${job.id}`} className="font-medium text-foreground hover:text-accent">{job.title}</Link>
                  </TableCell>
                  <TableCell><StatusChip tone={jobStatusMap[job.status].tone}>{jobStatusMap[job.status].label}</StatusChip></TableCell>
                  <TableCell className="text-foreground-muted">{job.department}</TableCell>
                  <TableCell className="text-foreground-muted">{job.location}</TableCell>
                  <TableCell>{jobApplicants.length}</TableCell>
                  <TableCell>{jobApplicants.filter((a) => a.application.stage === "shortlisted").length}</TableCell>
                  <TableCell>{jobApplicants.filter((a) => a.application.stage === "qualified").length}</TableCell>
                  <TableCell className="text-foreground-muted">{job.closing_date ? formatDate(job.closing_date) : "—"}</TableCell>
                  <TableCell className="text-right"><JobActionsMenu job={job} companySlug={session.companySlug} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
