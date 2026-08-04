import type { Metadata } from "next";
import {
  Building2, Briefcase, FileText, Sparkles, ClipboardList, Video, Mic, Database,
  Kanban, Users, GitCompare, MailX, Mail, UsersRound, Gauge,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Features", description: "Everything RecruitCandidates includes, from branded career pages to qualified candidate reviews." };

const features = [
  { icon: Building2, title: "Branded career pages", description: "A hosted, branded recruitment page for every company — no website required." },
  { icon: Briefcase, title: "Job creation & publishing", description: "Set requirements, screening weights, and application questions, then publish in one click." },
  { icon: FileText, title: "Candidate applications", description: "A clean application flow — no candidate account required." },
  { icon: Sparkles, title: "Semantic CV screening", description: "Structured analysis of skills, experience, and requirements — not keyword matching." },
  { icon: ClipboardList, title: "Assessments", description: "Multiple-choice and written assessments with sections, timers, and pass marks." },
  { icon: Video, title: "Asynchronous video interviews", description: "Employer-defined questions, browser recording, and secure candidate links." },
  { icon: Mic, title: "Transcription & AI analysis", description: "Every response transcribed and scored against your rubric, with evidence and summaries." },
  { icon: Database, title: "Applicant database", description: "Search and filter every applicant by score, stage, skills, and more." },
  { icon: Kanban, title: "Hiring pipeline", description: "A drag-and-drop Kanban board from Applied through Qualified." },
  { icon: Users, title: "Qualified candidates", description: "The final outcome — vetted candidates grouped by role, ready for a hiring decision." },
  { icon: GitCompare, title: "Candidate comparison", description: "Compare qualified candidates side by side on score, skills, and evidence." },
  { icon: MailX, title: "Rejection explanations", description: "AI drafts a respectful, job-related explanation — your team approves before it sends." },
  { icon: Mail, title: "Email automation", description: "Scheduled invitations, reminders, and notifications, with a full delivery log." },
  { icon: UsersRound, title: "Team collaboration", description: "Role-based access for owners, admins, recruiters, hiring managers, and reviewers." },
  { icon: Gauge, title: "Usage & subscription management", description: "Clear usage tracking against your plan, with upgrade prompts before you hit a wall." },
];

export default function FeaturesPage() {
  return (
    <div className="py-20 sm:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to go from application to qualified candidate"
          description="One workspace covering the whole hiring funnel — built for teams who want a clear, defensible shortlist, not a black box."
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft">
                <f.icon className="size-5 text-accent" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-foreground-muted">{f.description}</p>
            </Card>
          ))}
        </div>
        <div className="flex justify-center">
          <Button href="/signup" size="lg">Start hiring</Button>
        </div>
      </Container>
    </div>
  );
}
