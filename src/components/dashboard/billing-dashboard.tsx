"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Progress } from "@/components/ui/progress";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { subscriptionStatusMap } from "@/lib/status-maps";
import type { Payment, Plan, Subscription, UsagePeriod } from "@/types/database";

const METRIC_LABELS: Record<keyof UsagePeriod & keyof Plan["limits"], string> = {
  active_jobs: "Active jobs",
  applications: "Applications",
  ai_screenings: "AI CV screenings",
  assessment_invitations: "Assessment invitations",
  video_interview_candidates: "Video interview candidates",
  team_members: "Team members",
};

export function BillingDashboard({
  subscription,
  plan,
  usage,
  plans,
  payments,
  canManage,
}: {
  subscription: Subscription | null;
  plan: Plan | null;
  usage: UsagePeriod | null;
  plans: Plan[];
  payments: Payment[];
  canManage: boolean;
}) {
  const toast = useToast();
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function checkout(planId: string) {
    setBusy(true);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      // Full page navigation to a Paystack-hosted (or demo callback) URL, triggered by a user click.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.redirectUrl;
    } else {
      toast.error("Couldn't start checkout");
    }
  }

  async function cancel() {
    setBusy(true);
    const res = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Owner requested cancellation" }) });
    setBusy(false);
    if (res.ok) {
      toast.success("Subscription set to cancel at period end");
      setCancelOpen(false);
      window.location.reload();
    }
  }

  async function reactivate() {
    setBusy(true);
    const res = await fetch("/api/billing/reactivate", { method: "POST" });
    setBusy(false);
    if (res.ok) { toast.success("Subscription reactivated"); window.location.reload(); }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-foreground-muted">Current plan</p>
            <p className="text-xl font-semibold text-foreground">{plan?.name ?? "No plan"}</p>
            {subscription && <StatusChip tone={subscriptionStatusMap[subscription.status].tone} className="mt-1">{subscriptionStatusMap[subscription.status].label}</StatusChip>}
          </div>
          {subscription && plan && (
            <div className="text-right text-sm text-foreground-muted">
              <p>{formatCurrency(plan.amount, plan.currency)}/mo</p>
              <p>{subscription.cancel_at_period_end ? "Ends" : "Renews"} {formatDate(subscription.period_end)}</p>
            </div>
          )}
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setUpgradeOpen(true)}>Change plan</Button>
              {subscription?.cancel_at_period_end || subscription?.status === "canceled" ? (
                <Button size="sm" variant="secondary" loading={busy} onClick={reactivate}>Reactivate</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>Cancel</Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {plan && usage && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-foreground">Usage this period</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map((metric) => {
              const used = usage[metric];
              const limit = plan.limits[metric];
              const pct = Math.min(100, Math.round((used / limit) * 100));
              return (
                <div key={metric}>
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{METRIC_LABELS[metric]}</span>
                    <span>{used} / {limit}</span>
                  </div>
                  <Progress value={pct} tone={pct > 90 ? "danger" : pct > 70 ? "warning" : "accent"} className="mt-1" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Payment history</p>
        {payments.length === 0 ? (
          <p className="text-sm text-foreground-muted">No payments yet.</p>
        ) : (
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

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change plan</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            {plans.filter((p) => p.slug !== "enterprise").map((p) => (
              <button
                key={p.id}
                disabled={busy || p.id === plan?.id}
                onClick={() => checkout(p.id)}
                className={cn("flex items-center justify-between rounded-lg border p-3 text-left disabled:opacity-50", p.id === plan?.id ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50")}
              >
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <span className="text-sm text-foreground-muted">{formatCurrency(p.amount, p.currency)}/mo{p.id === plan?.id && " · current"}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel subscription</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground-muted">
            Your workspace stays fully active until {subscription && formatDate(subscription.period_end)}, then becomes read-only. Career page jobs will be unpublished after the grace period. You can reactivate any time before then.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep subscription</Button>
            <Button variant="danger" loading={busy} onClick={cancel}>Confirm cancellation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
