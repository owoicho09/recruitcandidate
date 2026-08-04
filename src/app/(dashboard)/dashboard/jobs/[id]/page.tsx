import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Users, ExternalLink } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getJob } from "@/lib/services/jobs";
import { listApplicantsForJob } from "@/lib/services/applications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { jobStatusMap, stageMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";
import { JobActionsMenu } from "@/components/dashboard/job-actions-menu";

export const metadata: Metadata = { title: "Job" };

export default async function JobDetailPage({ params }: PageProps<"/dashboard/jobs/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const job = await getJob(session.companyId, id);
  if (!job) notFound();

  const applicants = await listApplicantsForJob(session.companyId, id);
  const stageCounts = applicants.reduce<Record<string, number>>((acc, a) => {
    acc[a.application.stage] = (acc[a.application.stage] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{job.title}</h1>
            <StatusChip tone={jobStatusMap[job.status].tone}>{jobStatusMap[job.status].label}</StatusChip>
          </div>
          <p className="text-sm text-foreground-muted">{job.department} · {job.location} · {job.openings_count} openings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button href={`/${session.companySlug}/careers/${job.slug}`} variant="secondary" size="sm"><ExternalLink className="size-4" /> Preview</Button>
          <Button href={`/dashboard/jobs/${job.id}/edit`} variant="secondary" size="sm"><Pencil className="size-4" /> Edit</Button>
          <Button href={`/dashboard/jobs/${job.id}/applicants`} size="sm"><Users className="size-4" /> Applicants ({applicants.length})</Button>
          <JobActionsMenu job={job} companySlug={session.companySlug} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(stageMap).slice(0, 6).map(([stage, meta]) => (
          <Card key={stage} className="p-4">
            <p className="text-xs text-foreground-muted">{meta.label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{stageCounts[stage] ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Summary</p>
            <p className="mt-1 text-sm text-foreground-muted">{job.summary}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Required skills</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{job.required_skills.map((s) => <StatusChip key={s}>{s}</StatusChip>)}</div>
          </div>
          {job.closing_date && <p className="text-sm text-foreground-muted">Closes {formatDate(job.closing_date)}</p>}
          <div className="flex gap-3 border-t border-border pt-4">
            <Link href={`/dashboard/jobs/${job.id}/assessment`} className="text-sm text-accent hover:underline">Assessment configuration →</Link>
            <Link href={`/dashboard/jobs/${job.id}/video-interview`} className="text-sm text-accent hover:underline">Video interview configuration →</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
