import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { getCompany } from "@/lib/services/companies";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { getSubscription } from "@/lib/services/billing";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const company = await getCompany(session.companyId);
  const subscription = await getSubscription(session.companyId);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          fullName={session.fullName}
          email={session.email}
          role={session.role}
          companyName={company?.name ?? "Workspace"}
          companySlug={session.companySlug}
        />
        {subscription && <SubscriptionBanner subscription={subscription} />}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
