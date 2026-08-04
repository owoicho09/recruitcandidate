import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getCompany } from "@/lib/services/companies";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/dashboard/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const company = await getCompany(session.companyId);
  if (!company) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-foreground-muted">Workspace-level configuration.</p>
      </div>

      <SettingsForm company={company} readOnly={session.role !== "owner"} />

      <Card className="border-border">
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Billing</p>
          <p className="text-sm text-foreground-muted">Manage your plan, payment method, and usage.</p>
          <Button href="/dashboard/billing" variant="secondary" className="mt-2 self-start">Go to billing</Button>
        </CardContent>
      </Card>

      {session.role === "owner" && (
        <Card className="border-danger/30">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-danger">Danger zone</p>
            <p className="text-sm text-foreground-muted">Canceling your subscription makes this workspace read-only at the end of the billing period.</p>
            <Button href="/dashboard/billing" variant="danger" className="mt-2 self-start">Cancel subscription</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
