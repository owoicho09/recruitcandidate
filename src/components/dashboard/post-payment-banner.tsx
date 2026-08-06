"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PartyPopper, ExternalLink, Users, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { publicEnv } from "@/lib/env-public";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 8;

/**
 * Shown right after a "publish this job" checkout. Subscription activation
 * is webhook-driven (the sole source of truth — see /api/webhooks/paystack),
 * which usually lands within a second or two of the redirect but isn't
 * synchronous with it, so this polls briefly for the job to flip to
 * published rather than assuming it already has.
 */
export function PostPaymentBanner({ jobId, jobSlug, companySlug, published }: { jobId: string; jobSlug: string; companySlug: string; published: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("justPaid") === "1";
  const [pollCount, setPollCount] = React.useState(0);

  React.useEffect(() => {
    if (!justPaid || published || pollCount >= MAX_POLLS) return;
    const t = setTimeout(() => {
      setPollCount((c) => c + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [justPaid, published, pollCount, router]);

  if (!justPaid) return null;

  const publicUrl = `${publicEnv.appUrl}/${companySlug}/careers/${jobSlug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied");
  }

  if (!published) {
    const gaveUp = pollCount >= MAX_POLLS;
    return (
      <Card className="flex items-center gap-3 border-accent/30 bg-accent-soft p-5">
        {gaveUp ? (
          <>
            <PartyPopper className="size-4 shrink-0 text-accent" />
            <p className="flex-1 text-sm text-accent">Your payment went through — this page is just slow to catch up. Refresh to see your role live.</p>
            <Button size="sm" variant="secondary" onClick={() => router.refresh()}>Refresh</Button>
          </>
        ) : (
          <>
            <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-accent">Confirming your payment and publishing this role — this only takes a moment.</p>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 border-success/30 bg-success-soft p-5">
      <div className="flex items-center gap-2">
        <PartyPopper className="size-5 text-success" />
        <p className="text-sm font-semibold text-success">Your role is live.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button href={publicUrl} variant="secondary" size="sm"><ExternalLink className="size-4" /> View job page</Button>
        <Button variant="secondary" size="sm" onClick={copyLink}><Copy className="size-4" /> Copy application link</Button>
        <Button href={`/dashboard/jobs/${jobId}/applicants`} size="sm"><Users className="size-4" /> Go to applicants</Button>
      </div>
    </Card>
  );
}
