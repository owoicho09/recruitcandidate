import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getSubscription, getPlanForCompany, listPlans, listPayments, listAddonProducts, listCompanyAddons } from "@/lib/services/plan-access";
import { getUsageSummary } from "@/lib/services/usage-tracking";
import { BillingDashboard } from "@/components/dashboard/billing-dashboard";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const session = await requireSession();
  const [subscription, plan, plans, payments, addonProducts, companyAddons, usage] = await Promise.all([
    getSubscription(session.companyId),
    getPlanForCompany(session.companyId),
    listPlans(),
    listPayments(session.companyId),
    listAddonProducts(),
    listCompanyAddons(session.companyId, "active"),
    getUsageSummary(session.companyId),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-foreground-muted">Manage your plan, usage, and payment history.</p>
      </div>
      <BillingDashboard
        subscription={subscription}
        plan={plan}
        plans={plans}
        payments={payments}
        addonProducts={addonProducts}
        companyAddons={companyAddons}
        usage={usage}
        canManage={session.role === "owner"}
      />
    </div>
  );
}
