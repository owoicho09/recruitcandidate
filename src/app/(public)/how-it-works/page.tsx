import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UserPlus, Building2, Rocket, FileText, Sparkles, ClipboardCheck,
  ClipboardList, Video, Mic, Users,
} from "lucide-react";

export const metadata: Metadata = { title: "How it works", description: "The end-to-end journey from company sign-up to a qualified candidate shortlist." };

const journey = [
  { icon: UserPlus, title: "Company signs up", description: "Create an account, choose a plan, and pay through Paystack." },
  { icon: Building2, title: "Creates a company page", description: "Upload a logo, write a description, and pick a brand color for your career page." },
  { icon: Rocket, title: "Publishes a role", description: "Set requirements, screening weights, and application questions, then publish." },
  { icon: FileText, title: "Candidates apply", description: "Candidates submit applications and CVs through your career page — no account needed." },
  { icon: Sparkles, title: "AI screens CVs", description: "Every application is analyzed for skills, experience, and requirement fit, with a plain-language explanation." },
  { icon: ClipboardCheck, title: "Recruiter reviews & shortlists", description: "Your team reviews AI screening results and shortlists the strongest candidates." },
  { icon: ClipboardList, title: "Assessment sent", description: "Shortlisted candidates receive a role-specific assessment by email." },
  { icon: Video, title: "Video interview sent", description: "Candidates record asynchronous video answers to your questions." },
  { icon: Mic, title: "Responses transcribed & analysed", description: "Every response gets a transcript, question-level score, and AI summary." },
  { icon: Users, title: "Qualified candidates displayed by role", description: "Your team reviews the final, vetted shortlist and makes the hiring call." },
];

export default function HowItWorksPage() {
  return (
    <div className="py-20 sm:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="How it works"
          title="One connected journey, end to end"
          description="Every step below happens inside RecruitCandidates — no spreadsheets, no separate tools stitched together."
        />

        <div className="relative flex flex-col gap-6">
          <div className="absolute left-5 top-2 bottom-2 hidden w-px bg-border sm:block" aria-hidden />
          {journey.map((step, i) => (
            <div key={step.title} className="relative flex gap-5 sm:pl-0">
              <div className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
                <step.icon className="size-4.5 text-accent" />
              </div>
              <Card className="flex-1 p-5">
                <p className="text-xs font-semibold text-foreground-muted">Step {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm text-foreground-muted">{step.description}</p>
              </Card>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button href="/signup" size="lg">Start hiring</Button>
        </div>
      </Container>
    </div>
  );
}
