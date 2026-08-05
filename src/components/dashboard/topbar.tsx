"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, LogOut, Settings, ChevronDown, ExternalLink, LifeBuoy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "@/components/dashboard/sidebar";
import type { CompanyRole } from "@/types/database";

const roleLabel: Record<CompanyRole, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  reviewer: "Reviewer",
};

export function Topbar({
  fullName,
  email,
  role,
  companyName,
  companySlug,
  title,
}: {
  fullName: string;
  email: string;
  role: CompanyRole;
  companyName: string;
  companySlug: string;
  title?: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-md p-2 text-foreground-muted hover:bg-surface-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        {title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <StatusChip tone="neutral" className="hidden sm:inline-flex">{companyName}</StatusChip>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-muted focus:outline-none">
            <Avatar name={fullName} size="sm" />
            <span className="hidden text-sm font-medium text-foreground sm:inline">{fullName}</span>
            <ChevronDown className="size-3.5 text-foreground-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="text-foreground">{fullName}</p>
              <p className="font-normal text-foreground-muted">{email}</p>
              <p className="mt-0.5 font-normal text-accent">{roleLabel[role]}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${companySlug}/careers`} target="_blank">
                <ExternalLink className="size-4" /> View career page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings"><Settings className="size-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/support" target="_blank">
                <LifeBuoy className="size-4" /> Contact support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action="/api/auth/logout" method="POST" className="w-full">
                <button type="submit" className="flex w-full items-center gap-2 text-danger">
                  <LogOut className="size-4" /> Log out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <Sidebar className="absolute left-0 top-0 h-full max-w-[80vw] shadow-xl" onNavigate={() => setMobileOpen(false)} />
          <button
            className="absolute right-4 top-4 rounded-md bg-surface p-2 text-foreground-muted shadow-sm hover:bg-surface-muted"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </header>
  );
}
