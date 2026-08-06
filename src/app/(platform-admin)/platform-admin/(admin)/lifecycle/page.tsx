import type { Metadata } from "next";
import Link from "next/link";
import { getLifecycleFunnel, listCompaniesForLifecycleAdmin, LIFECYCLE_SEGMENTS } from "@/lib/services/lifecycle";
import { summarizeLifecycleEmails } from "@/lib/services/lifecycle-email";
import { Card } from "@/components/ui/card";
import { StatusChip, type ChipTone } from "@/components/ui/status-chip";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { formatRelativeTime, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/cn";
import type { LifecycleSegment } from "@/types/database";

export const metadata: Metadata = { title: "Platform Admin — Lifecycle" };

const SEGMENT_LABEL: Record<LifecycleSegment, string> = {
  signup_incomplete_setup: "Signed up, setup incomplete",
  setup_complete_no_job: "Setup complete, no job",
  draft_not_subscribed: "Draft job, not subscribed",
  subscribed_not_published: "Subscribed, not published",
  published_no_applications: "Published, no applications",
  receiving_applications: "Receiving applications",
  at_plan_limit: "At plan limit",
};

const SEGMENT_TONE: Record<LifecycleSegment, ChipTone> = {
  signup_incomplete_setup: "neutral",
  setup_complete_no_job: "info",
  draft_not_subscribed: "warning",
  subscribed_not_published: "warning",
  published_no_applications: "accent",
  receiving_applications: "success",
  at_plan_limit: "danger",
};

export default async function PlatformAdminLifecyclePage({ searchParams }: PageProps<"/platform-admin/lifecycle">) {
  const params = await searchParams;
  const segmentParam = typeof params.segment === "string" ? params.segment : undefined;
  const activeSegment = LIFECYCLE_SEGMENTS.includes(segmentParam as LifecycleSegment) ? (segmentParam as LifecycleSegment) : undefined;

  const [funnel, rows, allRows] = await Promise.all([
    getLifecycleFunnel(),
    listCompaniesForLifecycleAdmin(activeSegment),
    listCompaniesForLifecycleAdmin(),
  ]);
  const emailSummaries = await summarizeLifecycleEmails(rows.map((r) => r.company.id));

  const segmentCounts = LIFECYCLE_SEGMENTS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = allRows.filter((r) => r.company.lifecycle_segment === s).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lifecycle</h1>
        <p className="text-sm text-foreground-muted">Where every company sits between signup and their first application, and the follow-up funnel between those stages.</p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Signup → first application funnel</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {funnel.map((stage) => (
            <div key={stage.eventType} className="rounded-lg border border-border p-3">
              <p className="text-xs text-foreground-muted">{stage.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{stage.companies}</p>
              <p className="text-xs text-foreground-muted">
                {stage.pctOfPrevious === null ? `${stage.pctOfTotal}% of signups` : `${stage.pctOfPrevious}% of previous`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/platform-admin/lifecycle"
          className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", !activeSegment ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-foreground-muted hover:border-accent/50")}
        >
          All ({allRows.length})
        </Link>
        {LIFECYCLE_SEGMENTS.map((segment) => (
          <Link
            key={segment}
            href={`/platform-admin/lifecycle?segment=${segment}`}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", activeSegment === segment ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-foreground-muted hover:border-accent/50")}
          >
            {SEGMENT_LABEL[segment]} ({segmentCounts[segment] ?? 0})
          </Link>
        ))}
      </div>

      <Table>
        <TableHead><tr><TableHeadCell>Company</TableHeadCell><TableHeadCell>Owner</TableHeadCell><TableHeadCell>Segment</TableHeadCell><TableHeadCell>In this segment since</TableHeadCell><TableHeadCell>Last email sent</TableHeadCell><TableHeadCell>Next scheduled</TableHeadCell></tr></TableHead>
        <TableBody>
          {rows.map(({ company, owner }) => {
            const summary = emailSummaries[company.id];
            return (
              <TableRow key={company.id} interactive>
                <TableCell className="font-medium text-foreground"><Link href={`/platform-admin/companies/${company.id}`} className="hover:text-accent">{company.name}</Link></TableCell>
                <TableCell className="text-foreground-muted">{owner?.full_name ?? "—"}</TableCell>
                <TableCell><StatusChip tone={SEGMENT_TONE[company.lifecycle_segment]}>{SEGMENT_LABEL[company.lifecycle_segment]}</StatusChip></TableCell>
                <TableCell className="text-foreground-muted">{formatRelativeTime(company.lifecycle_segment_updated_at)}</TableCell>
                <TableCell className="text-foreground-muted">{summary?.lastSent ? `${summary.lastSent.email_type} · ${formatRelativeTime(summary.lastSent.sent_at!)}` : "—"}</TableCell>
                <TableCell className="text-foreground-muted">{summary?.nextScheduled ? `${summary.nextScheduled.email_type} · ${formatDate(summary.nextScheduled.scheduled_for)}` : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length === 0 && <p className="text-center text-sm text-foreground-muted">No companies in this segment.</p>}
    </div>
  );
}
