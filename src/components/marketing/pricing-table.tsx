"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { Plan } from "@/types/database";

const ANNUAL_DISCOUNT = 0.15;

export function PricingTable({ plans }: { plans: Plan[] }) {
  const [annual, setAnnual] = React.useState(false);
  const displayPlans = plans.filter((p) => p.slug !== "enterprise");
  const enterprise = plans.find((p) => p.slug === "enterprise");

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="inline-flex items-center gap-1 rounded-full bg-surface-muted p-1">
        <button
          onClick={() => setAnnual(false)}
          className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors", !annual ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted")}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors", annual ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted")}
        >
          Annual <span className="text-accent">— save 15%</span>
        </button>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        {displayPlans.map((plan) => {
          const monthlyEquivalent = annual ? Math.round(plan.amount * (1 - ANNUAL_DISCOUNT)) : plan.amount;
          return (
            <Card key={plan.id} className={cn("flex flex-col p-6", plan.slug === "growth" && "border-accent ring-1 ring-accent")}>
              {plan.slug === "growth" && <StatusChip tone="accent" className="mb-3 w-fit">Most popular</StatusChip>}
              <p className="text-sm font-semibold text-foreground">{plan.name}</p>
              <p className="mt-2 flex items-baseline gap-1 text-3xl font-semibold text-foreground">
                {formatCurrency(monthlyEquivalent, plan.currency)}
                <span className="text-sm font-normal text-foreground-muted">/mo</span>
              </p>
              {annual && <p className="text-xs text-foreground-muted">billed annually</p>}
              <ul className="mt-5 flex flex-col gap-2.5 text-sm text-foreground-muted">
                <PlanLine label={`${plan.limits.active_jobs} active jobs`} />
                <PlanLine label={`${plan.limits.applications.toLocaleString()} applications/mo`} />
                <PlanLine label={`${plan.limits.ai_screenings.toLocaleString()} AI CV screenings/mo`} />
                <PlanLine label={`${plan.limits.assessment_invitations.toLocaleString()} assessment invitations/mo`} />
                <PlanLine label={`${plan.limits.video_interview_candidates.toLocaleString()} video interview candidates/mo`} />
                <PlanLine label={`${plan.limits.team_members} team members`} />
                {plan.features.map((f) => (
                  <PlanLine key={f} label={f} />
                ))}
              </ul>
              <Button href="/signup" variant={plan.slug === "growth" ? "primary" : "secondary"} className="mt-6">
                Start with {plan.name}
              </Button>
            </Card>
          );
        })}
      </div>

      {enterprise && (
        <Card className="flex w-full flex-col items-center gap-3 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-base font-semibold text-foreground">{enterprise.name}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Custom usage, recruitment agency workspaces, custom domain, SSO, and dedicated support.
            </p>
          </div>
          <Button href="/contact" variant="secondary">Talk to us</Button>
        </Card>
      )}
    </div>
  );
}

function PlanLine({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
      {label}
    </li>
  );
}
