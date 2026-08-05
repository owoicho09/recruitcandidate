import { AlertTriangle, Ban, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Subscription } from "@/types/database";

export function SubscriptionBanner({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <div className="flex items-center justify-between gap-4 bg-accent-soft px-4 py-2.5 text-sm text-accent sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0" />
          <span>You&apos;re exploring on a free account. Choose a plan to publish jobs and start receiving applications.</span>
        </div>
        <Link href="/dashboard/billing" className="shrink-0 font-medium underline underline-offset-2">
          Choose a plan
        </Link>
      </div>
    );
  }

  if (subscription.status === "active") return null;

  const config: Record<string, { icon: typeof AlertTriangle; tone: string; message: string }> = {
    attention: { icon: AlertTriangle, tone: "bg-warning-soft text-warning", message: "There's a problem with your last payment. New jobs, invitations, and AI processing will pause after the grace period." },
    past_due: { icon: AlertTriangle, tone: "bg-warning-soft text-warning", message: "Your payment is past due. New jobs, invitations, and AI processing are paused until this is resolved." },
    non_renewing: { icon: AlertTriangle, tone: "bg-info-soft text-info", message: `Your subscription won't renew and access continues until ${new Date(subscription.period_end).toLocaleDateString()}.` },
    canceled: { icon: Ban, tone: "bg-danger-soft text-danger", message: "Your subscription is canceled. Choose a plan to resume publishing jobs." },
    pending: { icon: Sparkles, tone: "bg-accent-soft text-accent", message: "Choose a plan to publish jobs and start receiving applications." },
  };

  const c = config[subscription.status];
  if (!c) return null;

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm sm:px-6 lg:px-8 ${c.tone}`}>
      <div className="flex items-center gap-2">
        <c.icon className="size-4 shrink-0" />
        <span>{c.message}</span>
      </div>
      <Link href="/dashboard/billing" className="shrink-0 font-medium underline underline-offset-2">
        Manage billing
      </Link>
    </div>
  );
}
