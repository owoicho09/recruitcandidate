import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoShowcase } from "@/components/marketing/demo-showcase";

export const metadata: Metadata = { title: "Demo", description: "Walk through the employer dashboard, career page, screening reports, and video interviews." };

export default function DemoPage() {
  return (
    <div className="py-20 sm:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Demo"
          title="See the full workspace before you sign up"
          description="Click through each part of the product below, or jump straight into a live, pre-populated demo workspace."
        />

        <DemoShowcase />

        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <h3 className="text-lg font-semibold text-foreground">Ready to see it with your own data?</h3>
          <p className="max-w-md text-sm text-foreground-muted">
            Explore a fully-seeded demo workspace instantly, or start a free trial and set up your own career page today.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/api/auth/demo-login" size="lg">Explore the live demo</Button>
            <Button href="/signup" variant="secondary" size="lg">Start free trial</Button>
            <Button href="/contact" variant="ghost" size="lg">Book onboarding support</Button>
          </div>
        </Card>
      </Container>
    </div>
  );
}
