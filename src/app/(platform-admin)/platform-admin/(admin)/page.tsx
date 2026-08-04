import type { Metadata } from "next";
import { Building2, CreditCard, TrendingUp, UserPlus, AlertTriangle, FileText, Sparkles, Video, Database, Mail } from "lucide-react";
import { getPlatformStats } from "@/lib/services/platform-admin";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Platform Admin — Dashboard" };

export default async function PlatformAdminDashboard() {
  const stats = await getPlatformStats();

  const cards = [
    { label: "Total companies", value: stats.totalCompanies, icon: Building2 },
    { label: "Active subscriptions", value: stats.activeSubscriptions, icon: CreditCard },
    { label: "MRR", value: formatCurrency(stats.mrr), icon: TrendingUp },
    { label: "New subscriptions (30d)", value: stats.newSubscriptionsThisMonth, icon: UserPlus },
    { label: "Failed payments", value: stats.failedPayments, icon: AlertTriangle },
    { label: "Applications processed", value: stats.applicationsProcessed, icon: FileText },
    { label: "AI screenings", value: stats.aiScreenings, icon: Sparkles },
    { label: "Video interviews completed", value: stats.videoInterviews, icon: Video },
    { label: "Storage used", value: `${(stats.storageBytes / 1e9).toFixed(2)} GB`, icon: Database },
    { label: "Email volume", value: stats.emailVolume, icon: Mail },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-foreground-muted">Platform-wide activity across every company.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <c.icon className="size-4 text-foreground-muted" />
            <p className="mt-2 text-xl font-semibold text-foreground">{c.value}</p>
            <p className="text-xs text-foreground-muted">{c.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
