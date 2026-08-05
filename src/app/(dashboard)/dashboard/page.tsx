import type { Metadata } from "next";
import Link from "next/link";
import {
  Briefcase, FileText, Sparkles, ClipboardCheck, Star, ClipboardList, Video, Award,
  Plus, Copy, UserPlus, Clock,
} from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listJobs } from "@/lib/services/jobs";
import { listApplicantsForCompany } from "@/lib/services/applications";
import { getPlanForCompany, getSubscription } from "@/lib/services/plan-access";
import { getCurrentUsage } from "@/lib/services/usage-tracking";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import { subscriptionStatusMap, stageMap } from "@/lib/status-maps";
import { formatRelativeTime } from "@/lib/utils/format";
import { getCompany } from "@/lib/services/companies";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const [jobs, applicants, plan, usage, subscription, company] = await Promise.all([
    listJobs(session.companyId),
    listApplicantsForCompany(session.companyId),
    getPlanForCompany(session.companyId),
    getCurrentUsage(session.companyId),
    getSubscription(session.companyId),
    getCompany(session.companyId),
  ]);

  const activeJobs = jobs.filter((j) => j.status === "published").length;
  const applicationsThisMonth = applicants.length;
  const awaitingScreening = applicants.filter((a) => a.application.stage === "applied").length;
  const awaitingReview = applicants.filter((a) => a.application.stage === "cv_screened").length;
  const shortlisted = applicants.filter((a) => a.application.stage === "shortlisted").length;
  const assessmentsPending = applicants.filter((a) => a.application.stage === "assessment").length;
  const videoPending = applicants.filter((a) => a.application.stage === "video_interview").length;
  const qualified = applicants.filter((a) => a.application.stage === "qualified").length;

  const recent = [...applicants].sort((a, b) => +new Date(b.application.applied_at) - +new Date(a.application.applied_at)).slice(0, 6);

  const roleCounts = jobs
    .map((job) => ({ job, count: applicants.filter((a) => a.application.job_id === job.id).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // eslint-disable-next-line react-hooks/purity -- Server Component executed fresh per request; Date.now() here is intentional.
  const now = Date.now();
  const stuck = applicants
    .filter((a) => ["applied", "cv_screened", "shortlisted"].includes(a.application.stage))
    .filter((a) => now - new Date(a.application.stage_updated_at).getTime() > 5 * 24 * 3600 * 1000)
    .slice(0, 5);

  const checklistItems = [
    { label: "Upload logo", href: "/dashboard/career-page", done: Boolean(company?.logo_url) },
    { label: "Complete company information", href: "/dashboard/career-page", done: Boolean(company?.description) },
    { label: "Preview career page", href: `/${session.companySlug}/careers`, done: company?.career_page_status === "published" },
    { label: "Create first job", href: "/dashboard/jobs/new", done: jobs.length > 0 },
    { label: "Publish role", href: "/dashboard/jobs", done: activeJobs > 0 },
    { label: "Copy career page link", href: "/dashboard/career-page", done: false },
  ];

  const usagePct = plan && usage ? Math.round((usage.applications / plan.limits.applications) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <OnboardingChecklist items={checklistItems} companySlug={session.companySlug} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Active jobs" value={activeJobs} icon={Briefcase} />
        <StatCard label="Applications this month" value={applicationsThisMonth} icon={FileText} />
        <StatCard label="Awaiting AI screening" value={awaitingScreening} icon={Sparkles} tone={awaitingScreening > 0 ? "accent" : "neutral"} />
        <StatCard label="Awaiting recruiter review" value={awaitingReview} icon={ClipboardCheck} tone={awaitingReview > 0 ? "warning" : "neutral"} />
        <StatCard label="Shortlisted" value={shortlisted} icon={Star} />
        <StatCard label="Assessments pending" value={assessmentsPending} icon={ClipboardList} />
        <StatCard label="Video interviews pending" value={videoPending} icon={Video} />
        <StatCard label="Qualified candidates" value={qualified} icon={Award} tone="accent" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-foreground">Recent applications</p>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {recent.length === 0 && <EmptyState title="No applications yet" description="Publish a role to start receiving applications." className="border-none py-8" />}
            {recent.map((r) => (
              <Link key={r.application.id} href={`/dashboard/applicants/${r.application.id}`} className="flex items-center justify-between py-3 text-sm hover:text-accent">
                <div>
                  <p className="font-medium text-foreground">{r.candidate.first_name} {r.candidate.last_name}</p>
                  <p className="text-xs text-foreground-muted">{r.jobTitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={stageMap[r.application.stage].tone}>{stageMap[r.application.stage].label}</StatusChip>
                  <span className="text-xs text-foreground-muted">{formatRelativeTime(r.application.applied_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Quick actions</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button href="/dashboard/jobs/new" variant="secondary" size="sm" className="justify-start"><Plus className="size-4" /> Create job</Button>
            <Button href="/dashboard/qualified" variant="secondary" size="sm" className="justify-start"><Award className="size-4" /> View qualified candidates</Button>
            <CopyLinkButton path={`/${session.companySlug}/careers`} label="Copy career page" icon={<Copy className="size-4" />} />
            <Button href="/dashboard/team" variant="secondary" size="sm" className="justify-start"><UserPlus className="size-4" /> Invite team member</Button>
          </div>

          {subscription && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground-muted">Subscription</p>
                <StatusChip tone={subscriptionStatusMap[subscription.status].tone}>{subscriptionStatusMap[subscription.status].label}</StatusChip>
              </div>
              {plan && usage && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>Applications used</span>
                    <span>{usage.applications} / {plan.limits.applications}</span>
                  </div>
                  <Progress value={usagePct} tone={usagePct > 90 ? "danger" : usagePct > 70 ? "warning" : "accent"} className="mt-1.5" />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Roles with most applications</p>
          <div className="mt-3 flex flex-col gap-2">
            {roleCounts.map(({ job, count }) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{job.title}</span>
                <span className="text-foreground-muted">{count} applications</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 text-warning" />
            <p className="text-sm font-semibold text-foreground">Stuck candidates (5+ days without action)</p>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {stuck.length === 0 && <p className="py-4 text-sm text-foreground-muted">Nothing stuck right now.</p>}
            {stuck.map((r) => (
              <Link key={r.application.id} href={`/dashboard/applicants/${r.application.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-accent">
                <span className="text-foreground">{r.candidate.first_name} {r.candidate.last_name}</span>
                <StatusChip tone={stageMap[r.application.stage].tone}>{stageMap[r.application.stage].label}</StatusChip>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
