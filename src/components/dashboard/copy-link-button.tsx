"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env-public";

export function CopyLinkButton({ path, label, icon }: { path: string; label: string; icon: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${publicEnv.appUrl}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button variant="secondary" size="sm" className="justify-start" onClick={copy}>
      {copied ? <Check className="size-4 text-success" /> : icon}
      {copied ? "Copied!" : label}
    </Button>
  );
}
