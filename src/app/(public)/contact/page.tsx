import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/marketing/container";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Talk to the RecruitCandidates team about your hiring volume and needs." };

export default function ContactPage() {
  return (
    <div className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading eyebrow="Contact" title="Tell us about your hiring" description="Whether you're evaluating RecruitCandidates or need an Enterprise plan, we'll get back to you within one business day." />
        <div className="w-full max-w-xl">
          <ContactForm />
        </div>
      </Container>
    </div>
  );
}
