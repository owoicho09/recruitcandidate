import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/marketing/container";
import { SupportForm } from "@/components/marketing/support-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Support", description: "Get help with RecruitCandidates — report a bug, ask a billing question, or tell us what's not working." };

export default async function SupportPage() {
  const session = await getSession().catch(() => null);

  return (
    <div className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading eyebrow="Support" title="We're here to help" description="Report a bug, ask about your bill, or just tell us what's going wrong — we read every message and reply within one business day." />
        <div className="w-full max-w-xl">
          <SupportForm defaultEmail={session?.email} />
        </div>
      </Container>
    </div>
  );
}
