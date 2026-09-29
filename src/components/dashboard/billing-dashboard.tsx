"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
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
  subscription: subscriptionProp,
  plan: planProp,
  plans,
  payments,
  addonProducts,
  companyAddons,
  usage,
  canManage,
  publishJobId,
}: {
  subscription: Subscription | null;
  plan: Plan | null;
  plans: Plan[];
  payments: Payment[];
  addonProducts: AddonProduct[];
  companyAddons: CompanyAddon[];
  usage: UsageSummary;
  canManage: boolean;
  publishJobId?: string | null;
}) {
  const toast = useToast();
  // A "pending" row only means a checkout was started — it isn't a plan the company has.
  const subscription = subscriptionProp?.status === "pending" ? null : subscriptionProp;
  const plan = subscription ? planProp : null;
  const isCurrent = subscription?.status === "active" || subscription?.status === "non_renewing" || subscription?.status === "attention";
  // Once period_end passes, the server-side lapse sweep moves non_renewing to canceled, so status alone is enough here.
  const canResume = subscription?.status === "non_renewing";
  const [planDialogOpen, setPlanDialogOpen] = React.useState(Boolean(publishJobId) && !subscription);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [addonDialog, setAddonDialog] = React.useState<AddonProduct["kind"] | null>(null);
  const [annual, setAnnual] = React.useState(plan?.interval === "annual");
  const [busy, setBusy] = React.useState(false);
  // The plan being checked out — its row shows a spinner until the browser has left for Paystack.
  const [pendingPlanId, setPendingPlanId] = React.useState<string | null>(null);
  const [pendingSku, setPendingSku] = React.useState<string | null>(null);

  async function checkout(planId: string) {
    setPendingPlanId(planId);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, publishJobId }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      // Full page navigation to a Paystack-hosted (or demo callback) URL, triggered by a user click.
      // pendingPlanId stays set so the spinner keeps showing while Paystack loads.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.redirectUrl;
    } else {
      setPendingPlanId(null);
      toast.error("Couldn't start checkout", data.error ?? (res ? `Something went wrong (HTTP ${res.status}). Please try again or contact support.` : "Check your internet connection and try again."));
    }
  }

  async function buyAddon(sku: string) {
    setPendingSku(sku);
    const res = await fetch("/api/billing/addons/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      // pendingSku stays set so the spinner keeps showing while Paystack loads.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.redirectUrl;
    } else {
      setPendingSku(null);
      toast.error("Couldn't start checkout", data.error ?? (res ? `Something went wrong (HTTP ${res.status}). Please try again or contact support.` : "Check your internet connection and try again."));
    }
  }

  async function cancel() {
    setBusy(true);
    const res = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Owner requested cancellation" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast.success("Subscription set to cancel at period end");
      setCancelOpen(false);
      window.location.reload();
    } else {
      toast.error("Couldn't cancel subscription", data.error ?? `Something went wrong (HTTP ${res.status}). Please try again or contact support.`);
    }
  }

  async function reactivate() {
    setBusy(true);
    const res = await fetch("/api/billing/reactivate", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast.success("Subscription reactivated");
      window.location.reload();
    } else {
      toast.error("Couldn't reactivate", data.error ?? `Something went wrong (HTTP ${res.status}).`);
      if (data.requiresPlan) setPlanDialogOpen(true);
    }
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
              <p>{isCurrent ? `${subscription.cancel_at_period_end || subscription.status === "non_renewing" ? "Ends" : "Next payment"} ${formatDate(subscription.next_payment_date ?? subscription.period_end)}` : `Ended ${formatDate(subscription.period_end)}`}</p>
            </div>
          )}
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPlanDialogOpen(true)}>{isCurrent ? "Change plan" : subscription ? "Renew plan" : "Choose a plan"}</Button>
              {canResume ? (
                <Button size="sm" variant="secondary" loading={busy} onClick={reactivate}>Reactivate</Button>
              ) : (
                (subscription?.status === "active" || subscription?.status === "attention") && <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>Cancel</Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {!subscription && (
        <Card className="flex items-center gap-3 border-accent/30 bg-accent-soft p-5">
          <Sparkles className="size-5 shrink-0 text-accent" />
          <p className="text-sm text-accent">
            {publishJobId
              ? "Your job is ready to publish. Choose a plan to start receiving applications."
              : "You can explore your whole workspace for free. Choose a plan whenever you're ready to publish jobs and receive applications."}
          </p>
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
          <DialogHeader><DialogTitle>{isCurrent ? "Change plan" : "Choose a plan"}</DialogTitle></DialogHeader>
          <div className="mb-3 inline-flex items-center gap-1 self-start rounded-full bg-surface-muted p-1">
            <button disabled={!!pendingPlanId} onClick={() => setAnnual(false)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed", !annual ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted")}>Monthly</button>
            <button disabled={!!pendingPlanId} onClick={() => setAnnual(true)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed", annual ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted")}>Annual — 2 months free</button>
          </div>
          <div className="flex flex-col gap-2">
            {tierPlans.map((p) => (
              <button
                key={p.id}
                disabled={busy || !!pendingPlanId || (isCurrent && subscription?.status !== "attention" && p.id === plan?.id)}
                onClick={() => checkout(p.id)}
                aria-busy={pendingPlanId === p.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-opacity disabled:cursor-not-allowed",
                  pendingPlanId === p.id ? "border-accent bg-accent-soft" : "disabled:opacity-50",
                  pendingPlanId !== p.id && (p.id === plan?.id ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50"),
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {pendingPlanId === p.id && <Loader2 className="size-4 animate-spin text-accent" aria-hidden />}
                  {p.name}
                </span>
                <span className="text-sm text-foreground-muted">
                  {pendingPlanId === p.id ? "Redirecting to Paystack…" : <>{formatCurrency(p.amount, p.currency)}/{p.interval === "annual" ? "yr" : "mo"}{p.id === plan?.id && " · current"}</>}
                </span>
              </button>
            ))}
            {pendingPlanId && (
              <p role="status" className="text-xs text-foreground-muted">Setting up secure checkout — this can take a few seconds.</p>
            )}
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
                disabled={busy || !!pendingSku}
                onClick={() => buyAddon(a.sku)}
                aria-busy={pendingSku === a.sku}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-opacity disabled:cursor-not-allowed",
                  pendingSku === a.sku ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50 disabled:opacity-50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {pendingSku === a.sku && <Loader2 className="size-4 animate-spin text-accent" aria-hidden />}
                  {a.name}
                </span>
                <span className="text-sm text-foreground-muted">
                  {pendingSku === a.sku ? "Redirecting to Paystack…" : <>{formatCurrency(a.amount, a.currency)}{a.billing_type === "recurring" ? "/period" : ""}</>}
                </span>
              </button>
            ))}
            {pendingSku && (
              <p role="status" className="text-xs text-foreground-muted">Setting up secure checkout — this can take a few seconds.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel subscription</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground-muted">
            You won&apos;t be charged again. Your workspace stays fully active until {subscription && formatDate(subscription.period_end)}; after that, publishing jobs and receiving new applications pause until you subscribe again. You can reactivate any time before then.
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
