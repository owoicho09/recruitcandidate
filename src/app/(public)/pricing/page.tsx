import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Faq } from "@/components/marketing/faq";
import { PricingTable } from "@/components/marketing/pricing-table";
import { plans } from "@/lib/data/fixtures";

export const metadata: Metadata = { title: "Pricing", description: "Simple plans that scale with your hiring volume — every plan includes a branded career page." };

const faqItems = [
  { q: "What counts as an application?", a: "Every unique candidate submission to a job counts once toward your monthly application limit, regardless of how many times they're viewed or screened." },
  { q: "What happens when I reach a limit?", a: "You'll see a usage warning as you approach your limit. Once reached, the specific metered action (new job, screening, invite) is blocked until you upgrade or your billing period resets." },
  { q: "Can I upgrade immediately?", a: "Yes — upgrades activate as soon as payment is confirmed, and your new limits apply immediately." },
  { q: "What happens after cancellation?", a: "Your workspace becomes read-only at the end of your current billing period. Your data is retained according to our retention policy, and you can reactivate at any time." },
  { q: "Are unused limits carried over?", a: "No — usage resets at the start of each new billing period rather than accumulating." },
  { q: "Are Paystack fees included?", a: "Displayed prices are what you pay; standard Paystack processing fees are handled at checkout, same as any other Paystack transaction." },
];

export default function PricingPage() {
  return (
    <div className="py-20 sm:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Pricing"
          title="Plans that scale with your hiring volume"
          description="Every plan includes a branded career page, AI CV screening, and a full hiring pipeline. Upgrade any time as your team grows."
        />
        <PricingTable plans={plans} />
        <div className="flex flex-col gap-6">
          <SectionHeading title="Pricing questions" />
          <Faq items={faqItems} />
        </div>
      </Container>
    </div>
  );
}
