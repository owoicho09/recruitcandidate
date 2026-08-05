import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Faq } from "@/components/marketing/faq";
import { PricingTable } from "@/components/marketing/pricing-table";
import { listPlans } from "@/lib/services/plan-access";

export const metadata: Metadata = { title: "Pricing", description: "Simple plans that scale with your hiring volume — every plan includes a branded career page." };

const faqItems = [
  { q: "What counts as an application?", a: "Every unique candidate submission to a job counts once toward your application allowance for the period — CV screening, assessments, video interviews, and pipeline movement for that candidate don't cost anything extra." },
  { q: "What happens when I reach a limit?", a: "You'll see a usage warning as you approach your limit. Once reached, the specific metered action (publishing a job, submitting an application, inviting a team member) is blocked until you upgrade, buy an add-on, or your billing period resets." },
  { q: "Can I upgrade immediately?", a: "Yes — upgrades activate as soon as payment is confirmed, and your new limits apply immediately." },
  { q: "What happens after cancellation?", a: "Your workspace becomes read-only at the end of your current billing period. Your data is retained according to our retention policy, and you can reactivate at any time." },
  { q: "Are unused limits carried over?", a: "No — usage resets at the start of each new billing period rather than accumulating. Purchased application add-ons also expire at the end of the period they were bought in." },
  { q: "Are Paystack fees included?", a: "Displayed prices are what you pay; standard Paystack processing fees are handled at checkout, same as any other Paystack transaction." },
];

export default async function PricingPage() {
  const plans = await listPlans();
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
