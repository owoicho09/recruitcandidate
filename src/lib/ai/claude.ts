import { env, flags } from "@/lib/env";
import { id } from "@/lib/data/ids";
import type { AiScreeningResult, Application, Job, Recommendation, VideoQuestion } from "@/types/database";

let client: import("@anthropic-ai/sdk").default | null = null;

async function getClient() {
  if (!flags.hasClaude) return null;
  if (!client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: env.ANTHROPIC_REQUEST_TIMEOUT_MS, maxRetries: env.ANTHROPIC_MAX_RETRIES });
  }
  return client;
}

/** Forces structured JSON output from Claude via a single required tool call. */
async function callStructured<T>(model: string, system: string, userContent: string, toolName: string, inputSchema: Record<string, unknown>): Promise<T | null> {
  const anthropic = await getClient();
  if (!anthropic) return null;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userContent }],
    tools: [{ name: toolName, description: `Report the ${toolName} result.`, input_schema: inputSchema as never }],
    tool_choice: { type: "tool", name: toolName },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  return (toolUse?.input as T) ?? null;
}

function overlap(a: string[], b: string[]): string[] {
  const bLower = b.map((s) => s.toLowerCase());
  return a.filter((item) => bLower.some((x) => x.includes(item.toLowerCase()) || item.toLowerCase().includes(x)));
}

/**
 * Mock screening branch — heuristic, but produces schema-correct, explainable
 * output (spec Part D §14) purely from job/application text, so screening
 * reports read as plausible without ever calling a real model.
 */
function mockScreen(job: Job, application: Application): AiScreeningResult {
  const cvText = (application.cv_text ?? "").toLowerCase();
  const answeredSkills = job.required_skills.concat(job.preferred_skills);
  const matched = overlap(answeredSkills, [cvText, ...Object.values(application.application_answers)]);
  const missingMinimum = job.required_skills.filter((s) => !matched.includes(s));
  const missingPreferred = job.preferred_skills.filter((s) => !matched.includes(s));

  const skillsMatch = Math.round((matched.length / Math.max(1, answeredSkills.length)) * 100);
  const experienceMatch = Math.min(100, 55 + Math.round(Math.random() * 35));
  const overall = Math.round(skillsMatch * 0.5 + experienceMatch * 0.5);

  let recommendation: Recommendation;
  if (missingMinimum.length > 1 || overall < 40) recommendation = "low_match";
  else if (missingMinimum.length === 1 || overall < 60) recommendation = "manual_review";
  else if (overall < 80) recommendation = "possible_match";
  else recommendation = "strong_match";

  return {
    id: id(),
    application_id: application.id,
    overall_score: overall,
    skills_match: skillsMatch,
    experience_match: experienceMatch,
    education_match: job.education_requirements ? Math.round(60 + Math.random() * 35) : null,
    transferable_skills: job.preferred_skills.slice(0, 2),
    matched_requirements: matched.length ? matched : job.required_skills.slice(0, 1),
    missing_minimum_requirements: missingMinimum,
    missing_preferred_requirements: missingPreferred,
    strengths: matched.length ? [`Direct evidence of ${matched[0]}`] : ["Relevant adjacent experience"],
    concerns: missingMinimum.length ? [`No clear evidence of ${missingMinimum[0]}, a stated minimum requirement`] : [],
    achievements: [],
    uncertainty_notes: application.cv_parse_status !== "parsed" ? ["CV text extraction was incomplete — treat this score as provisional."] : [],
    explanation:
      missingMinimum.length > 0
        ? `The application shows relevant background for ${job.title}, but does not clearly demonstrate ${missingMinimum.join(", ")}, which ${job.title} lists as a minimum requirement. Overall alignment with the role is ${overall < 40 ? "limited" : "moderate"}.`
        : `The application demonstrates strong alignment with ${job.title}'s core requirements, with clear evidence of ${matched.slice(0, 2).join(" and ")}. Overall fit is ${overall >= 80 ? "very strong" : "solid"}.`,
    recommendation,
    review_state: recommendation === "low_match" || recommendation === "manual_review" ? "manual_review_required" : "ai_screening_complete",
    manual_override: null,
    model_version: "mock-heuristic-v1",
    prompt_version: env.AI_SCREENING_PROMPT_VERSION,
    created_at: new Date().toISOString(),
  };
}

const screeningToolSchema = {
  type: "object",
  properties: {
    overall_score: { type: "integer", minimum: 0, maximum: 100 },
    skills_match: { type: "integer", minimum: 0, maximum: 100 },
    experience_match: { type: "integer", minimum: 0, maximum: 100 },
    education_match: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    transferable_skills: { type: "array", items: { type: "string" } },
    matched_requirements: { type: "array", items: { type: "string" } },
    missing_minimum_requirements: { type: "array", items: { type: "string" } },
    missing_preferred_requirements: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    achievements: { type: "array", items: { type: "string" } },
    uncertainty_notes: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
    recommendation: { type: "string", enum: ["strong_match", "possible_match", "manual_review", "low_match"] },
  },
  required: [
    "overall_score", "skills_match", "experience_match", "education_match", "transferable_skills",
    "matched_requirements", "missing_minimum_requirements", "missing_preferred_requirements",
    "strengths", "concerns", "achievements", "uncertainty_notes", "explanation", "recommendation",
  ],
};

type ScreeningToolOutput = Omit<AiScreeningResult, "id" | "application_id" | "review_state" | "manual_override" | "model_version" | "prompt_version" | "created_at">;

export async function runCvScreening({ job, application }: { job: Job; application: Application }): Promise<AiScreeningResult> {
  const result = await callStructured<ScreeningToolOutput>(
    env.ANTHROPIC_SCREENING_MODEL,
    "You are a CV screening assistant. Score candidates on job-related fit using semantic understanding, not keyword matching. Ignore protected traits (age, gender, race, religion, disability, etc). Be specific and evidence-based in your explanation.",
    JSON.stringify({ job, cv_text: application.cv_text, application_answers: application.application_answers }),
    "report_screening_result",
    screeningToolSchema,
  );

  if (!result) return mockScreen(job, application);

  return {
    id: id(),
    application_id: application.id,
    ...result,
    review_state: result.recommendation === "low_match" || result.recommendation === "manual_review" ? "manual_review_required" : "ai_screening_complete",
    manual_override: null,
    model_version: env.ANTHROPIC_SCREENING_MODEL,
    prompt_version: env.AI_SCREENING_PROMPT_VERSION,
    created_at: new Date().toISOString(),
  };
}

/** Mock interview-answer analysis — used when a video response finishes "uploading". */
function mockAnalyzeVideoResponse(question: VideoQuestion, transcript: string) {
  const score = Math.round(55 + Math.random() * 40);
  return {
    ai_score: score,
    ai_analysis: {
      evidence: [`Referenced direct experience relevant to: ${question.prompt.slice(0, 60)}...`],
      strengths: ["Clear structure", "Concrete example provided"],
      concerns: score < 70 ? ["Answer could go deeper on technical trade-offs"] : [],
      missing_detail: score < 70 ? ["Did not quantify the outcome"] : [],
      summary: `${score >= 80 ? "Strong" : "Adequate"}, role-relevant answer.`,
    },
    transcript,
  };
}

const videoAnalysisToolSchema = {
  type: "object",
  properties: {
    ai_score: { type: "integer", minimum: 0, maximum: 100 },
    evidence: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    missing_detail: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["ai_score", "evidence", "strengths", "concerns", "missing_detail", "summary"],
};

interface VideoAnalysisToolOutput {
  ai_score: number;
  evidence: string[];
  strengths: string[];
  concerns: string[];
  missing_detail: string[];
  summary: string;
}

/**
 * Analyzes a video-interview answer transcript. Real audio transcription
 * isn't wired yet — callers currently pass a placeholder transcript — so
 * this scores placeholder text until a transcription provider is added, the
 * same limitation the mock branch always had.
 */
export async function analyzeVideoResponse(question: VideoQuestion, transcript: string) {
  const result = await callStructured<VideoAnalysisToolOutput>(
    env.ANTHROPIC_INTERVIEW_MODEL,
    "You are an interview-answer analyst. Evaluate how well a candidate's spoken answer addresses the interview question. Be specific and evidence-based.",
    JSON.stringify({ question: question.prompt, transcript }),
    "report_answer_analysis",
    videoAnalysisToolSchema,
  );

  if (!result) return mockAnalyzeVideoResponse(question, transcript);

  const { ai_score, evidence, strengths, concerns, missing_detail, summary } = result;
  return { ai_score, ai_analysis: { evidence, strengths, concerns, missing_detail, summary }, transcript };
}

export interface RejectionDraftInput {
  candidateFirstName: string;
  roleTitle: string;
  companyName: string;
  missingRequirement?: string;
  feedbackMode: "concise" | "detailed" | "none";
}

/** Mock rejection-explanation drafting — spec Part H §19, always employer-approved before send. */
function mockDraftRejectionEmail(input: RejectionDraftInput): string {
  if (input.feedbackMode === "none") {
    return `Hi ${input.candidateFirstName},\n\nThank you for applying for the ${input.roleTitle} role at ${input.companyName}. After careful review, we've decided not to move forward with your application at this time. We appreciate the time you invested and wish you the best in your search.\n\nBest,\n${input.companyName} Hiring Team`;
  }

  const detail = input.missingRequirement
    ? `the role called for stronger evidence of ${input.missingRequirement}, and other candidates aligned more closely with that requirement`
    : `other candidates aligned more closely with the published requirements for this role`;

  const detailedExtra =
    input.feedbackMode === "detailed"
      ? " If you'd like to strengthen a future application, we'd suggest highlighting concrete, measurable outcomes tied to this requirement."
      : "";

  return `Hi ${input.candidateFirstName},\n\nThank you for applying for the ${input.roleTitle} role at ${input.companyName} and for the time you put into your application.\n\nAfter careful review, we've decided not to move forward at this stage. This decision was based on the role's published criteria and the evidence in your application — specifically, ${detail}.${detailedExtra}\n\nWe genuinely appreciated learning about your background and encourage you to apply for future roles that fit your experience.\n\nBest,\n${input.companyName} Hiring Team`;
}

/** Always recruiter-reviewed and editable before send — spec Part H §19. Falls back to the mock template when Claude isn't configured. */
export async function draftRejectionEmail(input: RejectionDraftInput): Promise<string> {
  const anthropic = await getClient();
  if (!anthropic) return mockDraftRejectionEmail(input);

  if (input.feedbackMode === "none") return mockDraftRejectionEmail(input);

  const message = await anthropic.messages.create({
    model: env.ANTHROPIC_EMAIL_MODEL,
    max_tokens: 512,
    system:
      "You write warm, honest, concise rejection emails for job candidates on behalf of an employer. Never fabricate specifics you weren't given. Sign off as '{companyName} Hiring Team'. Return only the email body, no subject line, no preamble.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          candidateFirstName: input.candidateFirstName,
          roleTitle: input.roleTitle,
          companyName: input.companyName,
          missingRequirement: input.missingRequirement ?? null,
          feedbackDetail: input.feedbackMode === "detailed" ? "Include one concrete, constructive suggestion for future applications." : "Keep it brief — no coaching detail.",
        }),
      },
    ],
  });

  const text = message.content.find((block) => block.type === "text")?.text;
  return text?.trim() || mockDraftRejectionEmail(input);
}
