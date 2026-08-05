import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { hasActiveSubscription } from "@/lib/services/plan-access";
import { JobForm } from "@/components/dashboard/job-form";
import { SubscriptionInactiveState } from "@/components/ui/states";

export const metadata: Metadata = { title: "New Job" };

export default async function NewJobPage() {
  const session = await requireSession("recruiter");

  if (!(await hasActiveSubscription(session.companyId))) {
    return (
      <SubscriptionInactiveState
        description="Choose a plan to start creating and publishing jobs. You can keep exploring the rest of your dashboard in the meantime."
        action={{ label: "Choose a plan", href: "/dashboard/billing" }}
      />
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Create a job</h1>
        <p className="text-sm text-foreground-muted">It&apos;s created as a draft — publish when you&apos;re ready.</p>
      </div>
      <JobForm />
    </div>
  );
}
