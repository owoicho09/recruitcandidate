import type { ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Building2, Users, CreditCard, Receipt, Gauge, Briefcase, FileText, Activity, Shield, LogOut, Sparkles,
} from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

const NAV = [
  { href: "/platform-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform-admin/companies", label: "Companies", icon: Building2 },
  { href: "/platform-admin/users", label: "Users", icon: Users },
  { href: "/platform-admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/platform-admin/payments", label: "Payments", icon: Receipt },
  { href: "/platform-admin/usage", label: "Usage", icon: Gauge },
  { href: "/platform-admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/platform-admin/applications", label: "Applications", icon: FileText },
  { href: "/platform-admin/melvina", label: "Melvina chats", icon: Sparkles },
  { href: "/platform-admin/system", label: "System", icon: Activity },
];

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const session = await requirePlatformAdmin();

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-foreground text-background">
        <div className="flex h-16 items-center gap-2 px-5">
          <Shield className="size-5" />
          <span className="text-sm font-semibold">Platform Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-background/70 hover:bg-background/10 hover:text-background">
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-background/10 p-3">
          <p className="truncate px-3 text-xs text-background/50">{session.email}</p>
          <form action="/api/platform-admin/logout" method="POST">
            <button type="submit" className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-background/70 hover:bg-background/10 hover:text-background">
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-background px-8 py-8">{children}</main>
    </div>
  );
}
