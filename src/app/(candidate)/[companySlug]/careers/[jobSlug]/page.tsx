import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Briefcase, Clock, GraduationCap, Share2 } from "lucide-react";
import { getJobBySlug } from "@/lib/services/jobs";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/utils/format";
import { ShareButton } from "@/components/candidate/share-button";

const employmentLabel: Record<string, string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship", temporary: "Temporary" };
const workArrangementLabel: Record<string, string> = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" };

export async function generateMetadata({ params }: PageProps<"/[companySlug]/careers/[jobSlug]">): Promise<Metadata> {
  const { companySlug, jobSlug } = await params;
  const result = await getJobBySlug(companySlug, jobSlug);
  if (!result) return {};
  return { title: result.job.title, description: result.job.summary };
}

export default async function JobDetailPage({ params }: PageProps<"/[companySlug]/careers/[jobSlug]">) {
  const { companySlug, jobSlug } = await params;
  const result = await getJobBySlug(companySlug, jobSlug);
  if (!result) notFound();
  const { job } = result;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="accent">{job.department}</StatusChip>
          <StatusChip>{employmentLabel[job.employment_type]}</StatusChip>
          <StatusChip>{workArrangementLabel[job.work_arrangement]}</StatusChip>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{job.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
          <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {job.location}</span>
          {job.min_experience !== null && <span className="flex items-center gap-1.5"><Briefcase className="size-4" /> {job.min_experience}+ years</span>}
          {job.closing_date && <span className="flex items-center gap-1.5"><Clock className="size-4" /> Closes {formatDate(job.closing_date)}</span>}
        </div>
        {(job.salary_min || job.salary_max) && (
          <p className="text-sm font-medium text-foreground">
            {job.currency} {job.salary_min?.toLocaleString()} – {job.salary_max?.toLocaleString()}
          </p>
        )}
        <div className="flex gap-3">
          <Button href={`/${companySlug}/apply/${jobSlug}`} size="lg">Apply now</Button>
          <ShareButton />
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">About the role</h2>
        <p className="text-sm leading-relaxed text-foreground-muted">{job.summary}</p>
        <p className="text-sm leading-relaxed text-foreground-muted">{job.description}</p>
      </section>

      {job.responsibilities.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Responsibilities</h2>
          <ul className="flex flex-col gap-1.5 pl-5 text-sm text-foreground-muted [&>li]:list-disc">
            {job.responsibilities.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">Requirements</h2>
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Required skills</p>
        <div className="flex flex-wrap gap-1.5">
          {job.required_skills.map((s) => <StatusChip key={s}>{s}</StatusChip>)}
        </div>
        {job.preferred_skills.length > 0 && (
          <>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Preferred skills</p>
            <div className="flex flex-wrap gap-1.5">
              {job.preferred_skills.map((s) => <StatusChip key={s} tone="accent">{s}</StatusChip>)}
            </div>
          </>
        )}
        {job.education_requirements && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground-muted"><GraduationCap className="size-4" /> {job.education_requirements}</p>
        )}
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button href={`/${companySlug}/apply/${jobSlug}`} size="lg">Apply now</Button>
        <span className="flex items-center gap-1.5 text-sm text-foreground-muted"><Share2 className="size-4" /> Share this role with someone great</span>
      </div>
    </div>
  );
}
