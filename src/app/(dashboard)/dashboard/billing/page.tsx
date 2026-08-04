import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getSubscription, getPlanForCompany, getCurrentUsage, listPlans, listPayments } from "@/lib/services/billing";
import { BillingDashboard } from "@/components/dashboard/billing-dashboard";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const session = await requireSession();
  const [subscription, plan, usage, plans, payments] = await Promise.all([
    getSubscription(session.companyId),
    getPlanForCompany(session.companyId),
    getCurrentUsage(session.companyId),
    listPlans(),
    listPayments(session.companyId),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-foreground-muted">Manage your plan, usage, and payment history.</p>
      </div>
      <BillingDashboard subscription={subscription} plan={plan} usage={usage} plans={plans} payments={payments} canManage={session.role === "owner"} />
    </div>
  );
}
