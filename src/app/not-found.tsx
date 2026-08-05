import { SearchX } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Logo />
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
        <SearchX className="size-5 text-foreground-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="max-w-sm text-sm text-foreground-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Button href="/">Back to home</Button>
    </div>
  );
}
