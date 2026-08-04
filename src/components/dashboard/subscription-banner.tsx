import { AlertTriangle, Ban } from "lucide-react";
import Link from "next/link";
import type { Subscription } from "@/types/database";

export function SubscriptionBanner({ subscription }: { subscription: Subscription }) {
  if (subscription.status === "active") return null;

  const config: Record<string, { icon: typeof AlertTriangle; tone: string; message: string }> = {
    attention: { icon: AlertTriangle, tone: "bg-warning-soft text-warning", message: "There's a problem with your last payment. New jobs, invitations, and AI processing will pause after the grace period." },
    past_due: { icon: AlertTriangle, tone: "bg-warning-soft text-warning", message: "Your payment is past due. New jobs, invitations, and AI processing are paused until this is resolved." },
    non_renewing: { icon: AlertTriangle, tone: "bg-info-soft text-info", message: `Your subscription won't renew and access continues until ${new Date(subscription.period_end).toLocaleDateString()}.` },
    canceled: { icon: Ban, tone: "bg-danger-soft text-danger", message: "Your subscription is canceled. This workspace is read-only — reactivate to resume hiring." },
    pending: { icon: AlertTriangle, tone: "bg-warning-soft text-warning", message: "Your subscription isn't active yet. Complete checkout to unlock your workspace." },
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
