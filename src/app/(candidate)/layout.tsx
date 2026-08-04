import type { ReactNode } from "react";

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      {children}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-foreground-muted">
        Powered by RecruitCandidates
      </footer>
    </div>
  );
}
