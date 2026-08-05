"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
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
import type { AddonProduct, CompanyAddon, Payment, Plan, Subscription } from "@/types/database";
import type { UsageSummary, UsageMetricStatus } from "@/lib/services/usage-tracking";

const PROGRESS_TONE: Record<UsageMetricStatus["level"], "accent" | "warning" | "danger"> = {
  ok: "accent",
  warning_80: "warning",
  warning_95: "warning",
  exhausted: "danger",
};

const ADDON_KIND_LABEL: Record<AddonProduct["kind"], string> = {
  active_jobs: "Active jobs",
  applications: "Applications",
  team_members: "Team members",
  live_ai_interviews: "Live AI interview credits",
};

export function BillingDashboard({
  subscription,
  plan,
  plans,
  payments,
  addonProducts,
  companyAddons,
  usage,
  canManage,
}: {
  subscription: Subscription | null;
  plan: Plan | null;
  plans: Plan[];
  payments: Payment[];
  addonProducts: AddonProduct[];
  companyAddons: CompanyAddon[];
  usage: UsageSummary;
  canManage: boolean;
}) {
  const toast = useToast();
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [addonDialog, setAddonDialog] = React.useState<AddonProduct["kind"] | null>(null);
  const [annual, setAnnual] = React.useState(plan?.interval === "annual");
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
      toast.error("Couldn't start checkout", data.error);
    }
  }

  async function buyAddon(sku: string) {
    setBusy(true);
    const res = await fetch("/api/billing/addons/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.redirectUrl;
    } else {
      toast.error("Couldn't start checkout", data.error);
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

  const tierPlans = plans.filter((p) => p.slug !== "enterprise" && p.interval === (annual ? "annual" : "monthly"));

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-foreground-muted">Current plan</p>
            <p className="text-xl font-semibold text-foreground">{plan?.name ?? "No plan yet"}</p>
            {subscription ? (
              <StatusChip tone={subscriptionStatusMap[subscription.status].tone} className="mt-1">{subscriptionStatusMap[subscription.status].label}</StatusChip>
            ) : (
              <StatusChip tone="accent" className="mt-1">Exploring — no active plan</StatusChip>
            )}
          </div>
          {subscription && plan && (
            <div className="text-right text-sm text-foreground-muted">
              <p>{formatCurrency(plan.amount, plan.currency)}/{plan.interval === "annual" ? "yr" : "mo"}</p>
              <p>{subscription.next_payment_date && (subscription.cancel_at_period_end ? "Ends" : "Next payment")} {subscription.next_payment_date && formatDate(subscription.next_payment_date)}</p>
            </div>
          )}
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPlanDialogOpen(true)}>{subscription ? "Change plan" : "Choose a plan"}</Button>
              {subscription && (subscription.cancel_at_period_end || subscription.status === "canceled" ? (
                <Button size="sm" variant="secondary" loading={busy} onClick={reactivate}>Reactivate</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>Cancel</Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {!subscription && (
        <Card className="flex items-center gap-3 border-accent/30 bg-accent-soft p-5">
          <Sparkles className="size-5 shrink-0 text-accent" />
          <p className="text-sm text-accent">You can explore your whole workspace for free. Choose a plan whenever you&apos;re ready to publish jobs and receive applications.</p>
        </Card>
      )}

      {plan && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-foreground">Usage this period</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UsageBar label="Active jobs" status={usage.activeJobs} />
            <UsageBar label="Applications" status={usage.applications} />
            <UsageBar label="Team members" status={usage.teamMembers} />
            <div>
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>Live AI interview credits</span>
                <span>{usage.liveAiInterviewCredits}</span>
              </div>
              {plan.features.includes("live_ai_interviewer") ? (
                <p className="mt-1.5 text-xs text-foreground-muted">Buy more credits below as you need them.</p>
              ) : (
                <p className="mt-1.5 text-xs text-foreground-muted">Available from the Growth plan.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {plan && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-foreground">Add-ons</p>
          {companyAddons.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              {companyAddons.map((a) => {
                const product = addonProducts.find((p) => p.sku === a.sku);
                return (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{product?.name ?? a.sku} {a.quantity !== product?.quantity && `× ${a.quantity / (product?.quantity ?? 1)}`}</span>
                    <span className="text-xs text-foreground-muted">
                      {a.billing_type === "recurring" ? "renews with plan" : a.period_end ? `expires ${formatDate(a.period_end)}` : "one-time"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAddonDialog("active_jobs")}>Buy more jobs</Button>
              <Button size="sm" variant="secondary" onClick={() => setAddonDialog("applications")}>Buy more applications</Button>
              <Button size="sm" variant="secondary" onClick={() => setAddonDialog("team_members")}>Buy more team seats</Button>
              {plan.features.includes("live_ai_interviewer") && (
                <Button size="sm" variant="secondary" onClick={() => setAddonDialog("live_ai_interviews")}>Buy AI interview credits</Button>
              )}
            </div>
          )}
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

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{subscription ? "Change plan" : "Choose a plan"}</DialogTitle></DialogHeader>
          <div className="mb-3 inline-flex items-center gap-1 self-start rounded-full bg-surface-muted p-1">
            <button onClick={() => setAnnual(false)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", !annual ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted")}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", annual ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted")}>Annual — 2 months free</button>
          </div>
          <div className="flex flex-col gap-2">
            {tierPlans.map((p) => (
              <button
                key={p.id}
                disabled={busy || p.id === plan?.id}
                onClick={() => checkout(p.id)}
                className={cn("flex items-center justify-between rounded-lg border p-3 text-left disabled:opacity-50", p.id === plan?.id ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50")}
              >
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <span className="text-sm text-foreground-muted">{formatCurrency(p.amount, p.currency)}/{p.interval === "annual" ? "yr" : "mo"}{p.id === plan?.id && " · current"}</span>
              </button>
            ))}
            <p className="mt-1 text-xs text-foreground-muted">Need more than Scale? <Link href="/contact" className="text-accent underline underline-offset-2">Contact sales</Link> about Enterprise.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addonDialog !== null} onOpenChange={(open) => !open && setAddonDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{addonDialog && ADDON_KIND_LABEL[addonDialog]}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            {addonProducts.filter((a) => a.kind === addonDialog).map((a) => (
              <button
                key={a.sku}
                disabled={busy}
                onClick={() => buyAddon(a.sku)}
                className="flex items-center justify-between rounded-lg border border-border-strong p-3 text-left hover:border-accent/50 disabled:opacity-50"
              >
                <span className="text-sm font-medium text-foreground">{a.name}</span>
                <span className="text-sm text-foreground-muted">{formatCurrency(a.amount, a.currency)}{a.billing_type === "recurring" ? "/period" : ""}</span>
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

function UsageBar({ label, status }: { label: string; status: UsageMetricStatus }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>{label}</span>
        <span>{status.used} / {status.limit}</span>
      </div>
      <Progress value={status.pct} tone={PROGRESS_TONE[status.level]} className="mt-1" />
    </div>
  );
}
