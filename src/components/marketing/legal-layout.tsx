import type { ReactNode } from "react";
import { Container } from "@/components/marketing/container";

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="py-16 sm:py-20">
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-foreground-muted">Last updated {updated}</p>
        <div className="prose-legal mt-10 flex flex-col gap-6 text-sm leading-relaxed text-foreground-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_strong]:text-foreground">
          {children}
        </div>
      </Container>
    </div>
  );
}
