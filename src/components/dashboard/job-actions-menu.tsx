"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Eye, Rocket, Pause, Ban, Copy, Link2, Archive, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { publicEnv } from "@/lib/env-public";
import type { Job } from "@/types/database";

export function JobActionsMenu({ job, companySlug }: { job: Job; companySlug: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function setStatus(status: Job["status"]) {
    setBusy(true);
    const res = await fetch(`/api/jobs/${job.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      if (data.requiresPlan) {
        toast.error("Your job is ready to publish", "Choose a plan to start receiving applications.");
        router.push(`/dashboard/billing?publishJobId=${job.id}`);
        return;
      }
      toast.error("Couldn't update job", data.error);
      return;
    }
    toast.success(`Job ${status}`);
    router.refresh();
    setBusy(false);
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/jobs/${job.id}/duplicate`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      toast.success("Job duplicated");
      router.refresh();
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${publicEnv.appUrl}/${companySlug}/careers/${job.slug}`);
    toast.success("Link copied");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={busy} className="rounded-md p-1.5 text-foreground-muted hover:bg-surface-muted focus:outline-none disabled:opacity-50" onClick={(e) => e.stopPropagation()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/jobs/${job.id}/edit`}><Pencil className="size-4" /> Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${companySlug}/careers/${job.slug}`} target="_blank"><Eye className="size-4" /> Preview</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {job.status !== "published" && (
          <DropdownMenuItem onClick={() => setStatus("published")}><Rocket className="size-4" /> Publish</DropdownMenuItem>
        )}
        {job.status === "published" && (
          <DropdownMenuItem onClick={() => setStatus("paused")}><Pause className="size-4" /> Pause</DropdownMenuItem>
        )}
        {(job.status === "published" || job.status === "paused") && (
          <DropdownMenuItem onClick={() => setStatus("closed")}><Ban className="size-4" /> Close</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={duplicate}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}><Link2 className="size-4" /> Copy public link</DropdownMenuItem>
        <DropdownMenuSeparator />
        {job.status !== "archived" && (
          <DropdownMenuItem onClick={() => setStatus("archived")} className="text-danger"><Archive className="size-4" /> Archive</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
