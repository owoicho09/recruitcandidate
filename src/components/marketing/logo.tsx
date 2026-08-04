import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold text-foreground", className)}>
      <Image src="/logo-icon.png" alt="" width={28} height={28} className="size-7 shrink-0" priority />
      <span className="text-base tracking-tight">RecruitCandidates</span>
    </Link>
  );
}
