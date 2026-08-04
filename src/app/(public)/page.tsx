import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ClipboardList,
  Video,
  Users,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/marketing/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreRing } from "@/components/ui/score-ring";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { LoopingVideo } from "@/components/marketing/looping-video";
import { Faq } from "@/components/marketing/faq";
import { plans } from "@/lib/data/fixtures";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  description:
    "RecruitCandidates gives your company a branded career page, screens every application against the role, manages assessments and video interviews, and presents qualified candidates in one workspace.",
};

const outcomes = [
  { icon: Building2, label: "Branded career page" },
  { icon: Sparkles, label: "AI-assisted CV screening" },
  { icon: ClipboardList, label: "Assessments" },
  { icon: Video, label: "Video interviews" },
  { icon: Users, label: "Vetted candidates by role" },
];

const steps = [
  { title: "Create and publish a role", description: "Set requirements, screening weights, and application questions in minutes." },
  { title: "Candidates apply through your career page", description: "A branded page hosted for you — no company website required." },
  { title: "RecruitCandidates screens, assesses, and interviews", description: "Semantic CV screening, assessments, and async video interviews run automatically." },
  { title: "Your team reviews the strongest candidates", description: "Read AI explanations, watch interviews, and decide who moves forward." },
];

const faqItems = [
  { q: "Do candidates need an account?", a: "No. Candidates apply, take assessments, and record video interviews through secure links — no sign-up required." },
  { q: "Can we use this without a company website?", a: "Yes. Every company gets a hosted, branded career page at recruitcandidates.com/your-company/careers." },
  { q: "Does AI automatically reject candidates?", a: "No. AI screening assists review with scores and explanations, but only a human ever moves a candidate to rejected or qualified." },
  { q: "Can we watch the interviews?", a: "Yes. Every video response is available to play back alongside its transcript and AI analysis." },
  { q: "Can we customize the career page?", a: "Yes — logo, description, accent color, header style, and more, from the Career Page settings." },
  { q: "How are candidates scored?", a: "Using structured semantic analysis of skills, experience, and requirements — not rigid keyword matching." },
  { q: "What happens when we reach our plan limit?", a: "You'll see a usage warning ahead of time, and the specific action (new job, screening, invite) is blocked until you upgrade or the period resets." },
  { q: "Can recruitment agencies use it?", a: "Multi-client agency workspaces are on our roadmap; today each account represents one hiring company." },
  { q: "Does RecruitCandidates send rejection feedback?", a: "Optionally — AI drafts a respectful, job-related explanation that your team reviews and approves before it's sent." },
  { q: "Is applicant information separated between companies?", a: "Yes. Every record is scoped to a company with database-level row security — no cross-tenant access is possible." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_60%)]" />
        <Container className="relative flex flex-col items-center gap-12 py-20 sm:py-28">
          <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
            <StatusChip tone="accent" dot>
              Now screening with structured semantic analysis
            </StatusChip>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Turn applications into a <span className="text-accent">vetted shortlist</span>.
            </h1>
            <p className="max-w-2xl text-lg text-foreground-muted">
              RecruitCandidates gives your company a branded career page, screens every application against
              the role, manages assessments and video interviews, and presents qualified candidates in one
              workspace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                Start hiring <ArrowRight className="size-4" />
              </Button>
              <Button href="/how-it-works" variant="secondary" size="lg">
                See how it works
              </Button>
            </div>
          </div>

          <HeroMockup />
        </Container>
      </section>

      <section className="border-b border-border bg-surface py-10">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {outcomes.map((o) => (
              <div key={o.label} className="flex items-center gap-2 text-sm font-medium text-foreground-muted">
                <o.icon className="size-4 text-accent" />
                {o.label}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="flex flex-col gap-14">
          <SectionHeading eyebrow="How it works" title="From open role to vetted shortlist" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Card key={step.title} className="p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm text-foreground-muted">{step.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-20 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Career page</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Don&apos;t have a company website? You still get a proper recruitment page.
            </h2>
            <p className="text-base text-foreground-muted">
              Every company gets a hosted, branded career page — logo, description, open roles, and a full
              application flow — at a URL you can share anywhere.
            </p>
            <code className="w-fit rounded-md bg-surface-muted px-3 py-1.5 text-sm text-accent">
              recruitcandidates.com/acme/careers
            </code>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-foreground-muted">
              {["Company logo & description", "Open roles with filters", "Individual job pages", "A full application flow"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="overflow-hidden">
            <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))" }} />
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent">N</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Northwind Labs</p>
                  <p className="text-xs text-foreground-muted">Lagos · Software & Technology</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                {["Senior Backend Engineer", "Product Designer", "Customer Success Manager"].map((title) => (
                  <div key={title} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{title}</span>
                    <StatusChip tone="success">Published</StatusChip>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Card className="order-2 p-6 lg:order-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Screening report</p>
              <StatusChip tone="success">Strong match</StatusChip>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <ScoreRing score={87} label="Overall" />
              <div className="flex flex-1 flex-col gap-2">
                <ScoreBar label="Skills match" value={90} />
                <ScoreBar label="Experience match" value={84} />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 text-sm">
              <p className="font-medium text-foreground">Explanation</p>
              <p className="text-foreground-muted">
                Demonstrates strong alignment with core requirements, with direct evidence of distributed
                systems ownership and relevant financial-systems experience.
              </p>
            </div>
          </Card>
          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">AI screening</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Screened on meaning and role fit — not exact keyword matching.
            </h2>
            <p className="text-base text-foreground-muted">
              &ldquo;Client acquisition&rdquo; reads as relevant to &ldquo;business development.&rdquo;
              &ldquo;FastAPI&rdquo; experience counts toward a role asking for Python API frameworks.
              Every score comes with a plain-language explanation.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-foreground-muted">
              {["Relevant skills & transferable experience", "Missing requirements, clearly flagged", "Strengths & concerns, not just a number", "A human-readable explanation every time"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-20 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Video interviews</span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Asynchronous video interviews, reviewed on your schedule.
            </h2>
            <p className="text-base text-foreground-muted">
              Employer-defined questions, a secure candidate link, and browser-based recording — then a full
              transcript, question-level scoring, and playback for every response.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-foreground-muted">
              {["Employer-defined questions & prep time", "Secure, token-based candidate link", "Transcript + question-level score", "AI summary alongside full video playback"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-foreground/90">
              <LoopingVideo />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                &ldquo;Walk us through the most complex distributed system you&apos;ve operated.&rdquo;
              </p>
              <ScoreRing score={82} size={44} />
            </div>
          </Card>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="Qualified candidates" title="The outcome: a clear, reviewable shortlist by role" />
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Senior Backend Engineer</p>
                <p className="text-xs text-foreground-muted">2 openings · 3 qualified</p>
              </div>
              <StatusChip tone="success">Ready to review</StatusChip>
            </div>
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { name: "Chinedu Okafor", cv: 91, assessment: 88, video: 85, note: "Strong ownership of production ledger systems." },
                { name: "Fatima Bello", cv: 86, assessment: 79, video: 90, note: "Excellent incident response depth." },
                { name: "Segun Adewale", cv: 83, assessment: 82, video: 78, note: "Solid, broad backend background." },
              ].map((c) => (
                <div key={c.name} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <ScoreRing score={Math.round((c.cv + c.assessment + c.video) / 3)} size={40} />
                  </div>
                  <p className="mt-2 text-xs text-foreground-muted">{c.note}</p>
                  <div className="mt-3 flex gap-3 text-xs text-foreground-muted">
                    <span>CV {c.cv}</span>
                    <span>Assess. {c.assessment}</span>
                    <span>Video {c.video}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-20 sm:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="Pricing" title="Simple plans that scale with your hiring" description="Every plan includes a branded career page. Upgrade any time as volume grows." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {plans.filter((p) => p.slug !== "enterprise").map((plan) => (
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
                  <li>{plan.limits.ai_screenings.toLocaleString()} AI screenings/mo</li>
                  <li>{plan.limits.team_members} team members</li>
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

      <section className="py-20 sm:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <Faq items={faqItems} />
        </Container>
      </section>

      <section className="border-t border-border bg-foreground py-20">
        <Container className="flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-background sm:text-4xl">
            Build your recruitment page and start receiving qualified candidates.
          </h2>
          <Button href="/signup" size="lg">
            Start hiring <ArrowRight className="size-4" />
          </Button>
        </Container>
      </section>
    </>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
