"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Plan, Subscription } from "@/types/database";

export function CompanyActions({ companyId, subscription, plans, currentPlanId }: { companyId: string; subscription: Subscription | null; plans: Plan[]; currentPlanId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function suspend() {
    setBusy(true);
    const res = await fetch(`/api/platform-admin/companies/${companyId}/suspend`, { method: "POST" });
    setBusy(false);
    if (res.ok) { toast.success("Company suspended"); router.refresh(); }
  }

  async function restore() {
    setBusy(true);
    const res = await fetch(`/api/platform-admin/companies/${companyId}/restore`, { method: "POST" });
    setBusy(false);
    if (res.ok) { toast.success("Company restored"); router.refresh(); }
  }

  async function changePlan(planId: string) {
    setBusy(true);
    const res = await fetch(`/api/platform-admin/companies/${companyId}/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
    setBusy(false);
    if (res.ok) { toast.success("Plan updated"); router.refresh(); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={currentPlanId} onValueChange={changePlan} disabled={busy}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Change plan" /></SelectTrigger>
        <SelectContent>
          {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.interval})</SelectItem>)}
        </SelectContent>
      </Select>
      {subscription?.status === "canceled" ? (
        <Button size="sm" variant="secondary" disabled={busy} onClick={restore}><RotateCcw className="size-4" /> Restore</Button>
      ) : (
        <Button size="sm" variant="danger" disabled={busy} onClick={suspend}><Ban className="size-4" /> Suspend</Button>
      )}
    </div>
  );
}
