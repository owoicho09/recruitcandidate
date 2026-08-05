"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Logo />
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
        <AlertTriangle className="size-5 text-danger" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-sm text-foreground-muted">
          An unexpected error occurred. You can try again, or head back to the homepage.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={reset}>Try again</Button>
        <Button href="/">Back to home</Button>
      </div>
    </div>
  );
}
