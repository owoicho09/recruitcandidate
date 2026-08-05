import { env, flags } from "@/lib/env";

let client: import("@anthropic-ai/sdk").default | null = null;

async function getClient() {
  if (!flags.hasClaude) return null;
  if (!client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: env.ANTHROPIC_REQUEST_TIMEOUT_MS, maxRetries: env.ANTHROPIC_MAX_RETRIES });
  }
  return client;
}

export interface MelvinaMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MelvinaContext {
  firstName: string;
  companyName: string;
  role: string;
  planName: string | null;
}

export interface MelvinaComplaint {
  summary: string;
  severity: "low" | "medium" | "high";
}

const REPORT_COMPLAINT_TOOL = {
  name: "report_complaint",
  description:
    "Forward a complaint or bug report to the RecruitCandidates support team. Only call this when the user is clearly reporting something broken, unfair, or frustrating and wants it addressed — never for routine 'how do I...' questions.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "A clear, concise summary of the complaint, in the user's own words where possible." },
      severity: { type: "string", enum: ["low", "medium", "high"], description: "How urgent/impactful this seems." },
    },
    required: ["summary", "severity"],
  },
};

function buildSystemPrompt(context: MelvinaContext): string {
  return `You are Melvina, the friendly in-app guide and support assistant for RecruitCandidates — a multi-tenant recruitment SaaS. You're embedded as a floating chat widget inside the employer dashboard. Your job is to teach people how to use the product and to help with on-demand questions and problems, the way a good human support rep would: warm, concise, and precise, never robotic or over-formal.

What RecruitCandidates does, end to end:
- Employers sign up, create a company workspace, and get a branded public career page at /{companySlug}/careers.
- They post jobs (draft → published), each with requirements, screening question, and adjustable AI screening weights (skills, experience, education, etc).
- Candidates apply through the public career page — CV upload, contact info, optional cover note. Every submitted application counts once against the plan's application allowance for that billing period.
- Every application is automatically CV-screened by AI, producing a score, a recommendation (strong match / possible match / manual review / low match), and a plain-language explanation — visible on the applicant's profile.
- Recruiters move applicants through a pipeline (Kanban board under Pipeline): applied → CV screened → shortlisted → assessment → video interview → qualified, or rejected at any stage.
- Optional assessments (multiple-choice + written questions, auto-scored) and optional prerecorded video interviews (candidate records answers to set questions; AI transcribes and scores them) can be attached per job.
- Qualified candidates land in a dedicated Qualified Candidates view for side-by-side comparison.
- Rejecting a candidate can auto-draft a polite explanation email (recruiter always reviews/edits before it sends).
- Team members are invited by email with a role (owner, admin, recruiter, hiring manager, reviewer) controlling what they can do.
- Billing lives under Dashboard → Billing: Starter/Growth/Scale plans (monthly or annual, 2 months free annually) with limits on active jobs, applications per period, and team members; Enterprise is custom/contact sales. Companies can also buy add-ons there — extra active jobs, extra applications (one-time, expire at period end), extra team seats, and (Growth+) live AI interview credits.
- A brand-new signup can explore the whole dashboard for free, but needs to choose a plan (Billing page) before creating any job.

You're currently talking with ${context.firstName} from ${context.companyName}, a ${context.role}, on the ${context.planName ?? "no active"} plan.

Rules:
- Keep answers short — a couple of sentences or a tight list, not an essay. Point to the exact dashboard page/section when relevant (e.g. "Dashboard → Billing").
- Never invent a feature, page, or limit that isn't described above — if you're not sure, say so plainly rather than guessing.
- If the person is clearly reporting a bug, an unfair charge, or something broken and wants it addressed, call report_complaint with a clear summary — and tell them in your reply that you've forwarded it to the team and they'll hear back by email. Don't use the tool for ordinary questions or mild feedback.
- You cannot take actions in the product yourself (can't publish jobs, change plans, etc) — you can only explain and guide.`;
}

/**
 * Returns the raw Anthropic MessageStream so the caller (the API route) can
 * pipe `.on("text", ...)` deltas straight into an HTTP ReadableStream and
 * read `.finalMessage()` afterward for any tool call — see
 * src/app/api/melvina/chat/route.ts. Conversation history is capped to the
 * last 20 messages so a long-running widget session can't grow cost/context
 * unboundedly.
 */
export async function createMelvinaStream(messages: MelvinaMessage[], context: MelvinaContext) {
  const anthropic = await getClient();
  if (!anthropic) return null;

  const trimmed = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

  return anthropic.messages.stream({
    model: env.ANTHROPIC_CHAT_MODEL,
    max_tokens: 600,
    system: buildSystemPrompt(context),
    messages: trimmed,
    tools: [REPORT_COMPLAINT_TOOL as never],
  });
}

export function extractComplaint(message: { content: Array<{ type: string; name?: string; input?: unknown }> }): MelvinaComplaint | null {
  const toolUse = message.content.find((b) => b.type === "tool_use" && b.name === "report_complaint");
  if (!toolUse) return null;
  return toolUse.input as MelvinaComplaint;
}
