import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Briefcase,
  Sparkles,
  ClipboardList,
  Video,
  FileText,
  ListChecks,
  MessageSquareText,
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { listPlans } from "@/lib/services/plan-access";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  description:
    "RecruitCandidates screens every applicant against your job requirements, sends assessments and video interviews, and gives your team a clear shortlist of qualified candidates — instead of hundreds of CVs to read one by one.",
};

const benefits = [
  { icon: Globe, label: "A branded recruitment page", description: "Every company gets its own hosted career page — no website required." },
  { icon: Briefcase, label: "Job publishing & applications", description: "Publish a role and start collecting applications in minutes." },
  { icon: Sparkles, label: "AI-assisted CV screening", description: "Every CV is scored against the role's real requirements, not keywords." },
  { icon: ClipboardList, label: "Assessments", description: "Send role-specific assessments and get auto-scored results." },
  { icon: Video, label: "Prerecorded video interviews", description: "Candidates record answers on their own time, on a secure link." },
  { icon: FileText, label: "Transcription & analysis", description: "Every response comes with a transcript and a plain-language summary." },
  { icon: ListChecks, label: "Qualified candidates by role", description: "See your strongest applicants for each role, side by side." },
  { icon: MessageSquareText, label: "Reviewed rejection feedback", description: "AI drafts a respectful explanation — your team approves it before it sends." },
  { icon: LayoutDashboard, label: "One workspace", description: "Every stage of hiring, from first application to final decision, in one place." },
];

const audiences = [
  { icon: Building2, label: "Recruitment agencies" },
  { icon: Users, label: "Internal HR teams" },
  { icon: Briefcase, label: "Staffing companies" },
  { icon: Layers, label: "Businesses hiring across multiple roles" },
  { icon: Inbox, label: "Teams receiving hundreds of applications" },
];

export default async function HomePage() {
  const plans = (await listPlans()).filter((p) => p.interval === "monthly");
  const displayPlans = plans.filter((p) => p.slug !== "enterprise");

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Still reviewing hundreds of CVs manually?
          </h1>
          <p className="max-w-xl text-lg text-foreground-muted">
            RecruitCandidates screens applicants against your job requirements, sends assessments and video
            interviews, and gives your team a clear shortlist of qualified candidates.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Button href="/signup" size="lg">
              Create your account <ArrowRight className="size-4" />
            </Button>
            <p className="text-xs text-foreground-muted">Free to start — no card required.</p>
          </div>
        </Container>
      </section>

      {/* Demo */}
      <section className="border-b border-border bg-surface py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-8">
          <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">See it in action</span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              A real workflow, start to finish
            </h2>
            <p className="text-base text-foreground-muted">
              This recording shows RecruitCandidates processing more than 160 applicants in 24 hours — from
              application, through screening, to a reviewed shortlist. No staging, no edits.
            </p>
          </div>

          <Card className="w-full max-w-3xl overflow-hidden p-0">
            <video
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full bg-foreground"
              src="/videos/product-demo.webm"
            />
          </Card>

          <Button href="/signup" size="lg">
            Create your account <ArrowRight className="size-4" />
          </Button>
        </Container>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="What you get" title="Everything between a job post and a shortlist" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.label} className="flex gap-3 rounded-xl border border-border p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <b.icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{b.label}</p>
                  <p className="mt-0.5 text-sm text-foreground-muted">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Screening accuracy */}
      <section className="border-y border-border bg-surface py-16 sm:py-20">
        <Container className="flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ShieldCheck className="size-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Screening that understands the role, not just the words on a CV
          </h2>
          <p className="text-base text-foreground-muted">
            RecruitCandidates looks beyond exact keyword matches — it considers relevant experience,
            transferable skills, and how closely a candidate&apos;s background fits what the role actually
            requires. It supports your team&apos;s review with clear, explained scores. It never makes the
            final hiring decision — that stays with you.
          </p>
        </Container>
      </section>

      {/* Who it's for */}
      <section className="py-16 sm:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading eyebrow="Built for" title="Teams buried under applications" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {audiences.map((a) => (
              <div key={a.label} className="flex flex-col items-center gap-2 rounded-xl border border-border p-5 text-center">
                <a.icon className="size-5 text-accent" />
                <p className="text-sm font-medium text-foreground">{a.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section className="border-y border-border bg-surface py-16 sm:py-20">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <SectionHeading eyebrow="Pricing" title="Simple plans that scale with your hiring" description="Every plan includes a branded career page. Create your account to get started — choose a plan when you're ready to publish." />
            <Button href="/signup">
              Create your account <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {displayPlans.map((plan) => (
              <Card key={plan.id} className={cn("flex flex-col p-6", plan.slug === "growth" && "border-accent ring-1 ring-accent")}>
                {plan.slug === "growth" && <StatusChip tone="accent" className="mb-3 w-fit">Most popular</StatusChip>}
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {formatCurrency(plan.amount, plan.currency)}
                  <span className="text-sm font-normal text-foreground-muted">/mo</span>
                </p>
                <ul className="mt-5 flex flex-col gap-2 text-sm text-foreground-muted">
                  <li>{plan.limits.active_jobs} active jobs</li>
                  <li>{plan.limits.applications.toLocaleString()} applications/mo</li>
                  <li>{plan.limits.team_members} team members</li>
                  {plan.features.includes("live_ai_interviewer") && <li>Live AI interviewer</li>}
                </ul>
                <Button href="/signup" variant={plan.slug === "growth" ? "primary" : "secondary"} className="mt-6">
                  Start with {plan.name}
                </Button>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-foreground-muted">
            Need custom usage or an agency workspace? <Link href="/contact" className="text-accent underline underline-offset-2">Talk to us</Link> about Enterprise.
          </p>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-4 text-center">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Spend your time reviewing the best candidates, not every application.
          </h2>
          <p className="max-w-md text-base text-foreground-muted">
            Create your workspace, publish your first role, and start receiving applicants through your own
            recruitment page.
          </p>
          <Button href="/signup" size="lg">
            Create your account <ArrowRight className="size-4" />
          </Button>
        </Container>
      </section>
    </>
  );
}
