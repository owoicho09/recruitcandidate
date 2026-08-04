"use client";

import * as React from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton() {
  const [copied, setCopied] = React.useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ url: window.location.href });
        return;
      } catch {
        // fall through to clipboard copy
      }
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button variant="secondary" size="lg" onClick={share}>
      {copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
