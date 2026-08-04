import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyForAdmin } from "@/lib/services/platform-admin";
import { listPlans } from "@/lib/services/billing";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { subscriptionStatusMap } from "@/lib/status-maps";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { CompanyActions } from "@/components/platform-admin/company-actions";

export const metadata: Metadata = { title: "Platform Admin — Company" };

export default async function PlatformAdminCompanyPage({ params }: PageProps<"/platform-admin/companies/[id]">) {
  const { id } = await params;
  const [detail, plans] = await Promise.all([getCompanyForAdmin(id), listPlans()]);
  if (!detail) notFound();

  const { company, subscription, plan, members, usage, payments, auditLogs, jobs, applications } = detail;
  const owner = members.find((m) => m.role === "owner");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
          <p className="text-sm text-foreground-muted">{company.slug} · Owner: {owner?.full_name ?? "—"} ({owner?.email})</p>
        </div>
        <CompanyActions companyId={company.id} subscription={subscription} plans={plans} currentPlanId={plan?.id} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-foreground-muted">Plan</p><p className="mt-1 text-lg font-semibold text-foreground">{plan?.name ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-foreground-muted">Status</p><div className="mt-1">{subscription && <StatusChip tone={subscriptionStatusMap[subscription.status].tone}>{subscriptionStatusMap[subscription.status].label}</StatusChip>}</div></Card>
        <Card className="p-4"><p className="text-xs text-foreground-muted">Jobs</p><p className="mt-1 text-lg font-semibold text-foreground">{jobs.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-foreground-muted">Applications</p><p className="mt-1 text-lg font-semibold text-foreground">{applications.length}</p></Card>
      </div>

      {usage && plan && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold text-foreground">Usage</p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p className="text-foreground-muted">Jobs: <span className="text-foreground">{usage.active_jobs}/{plan.limits.active_jobs}</span></p>
            <p className="text-foreground-muted">Applications: <span className="text-foreground">{usage.applications}/{plan.limits.applications}</span></p>
            <p className="text-foreground-muted">AI screenings: <span className="text-foreground">{usage.ai_screenings}/{plan.limits.ai_screenings}</span></p>
            <p className="text-foreground-muted">Assessments: <span className="text-foreground">{usage.assessment_invitations}/{plan.limits.assessment_invitations}</span></p>
            <p className="text-foreground-muted">Video interviews: <span className="text-foreground">{usage.video_interview_candidates}/{plan.limits.video_interview_candidates}</span></p>
            <p className="text-foreground-muted">Team members: <span className="text-foreground">{usage.team_members}/{plan.limits.team_members}</span></p>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="mb-2 text-sm font-semibold text-foreground">Billing events</p>
        {payments.length === 0 ? <p className="text-sm text-foreground-muted">No payments yet.</p> : (
          <Table>
            <TableHead><tr><TableHeadCell>Date</TableHeadCell><TableHeadCell>Amount</TableHeadCell><TableHeadCell>Status</TableHeadCell><TableHeadCell>Reference</TableHeadCell></tr></TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-foreground-muted">{p.paid_at ? formatDate(p.paid_at) : "—"}</TableCell>
                  <TableCell>{formatCurrency(p.amount, p.currency)}</TableCell>
                  <TableCell><StatusChip tone={p.status === "success" ? "success" : "danger"}>{p.status}</StatusChip></TableCell>
                  <TableCell className="text-foreground-muted">{p.paystack_reference}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-sm font-semibold text-foreground">Audit events</p>
        {auditLogs.length === 0 ? <p className="text-sm text-foreground-muted">No audit events yet.</p> : (
          <div className="flex flex-col gap-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">{log.actor_name} — {log.action.replace(/\./g, " ")}</span>
                <span className="text-xs text-foreground-muted">{formatDateTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
