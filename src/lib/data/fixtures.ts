import { id, daysAgo, daysFromNow, pick, pickMany, randomInt } from "@/lib/data/ids";
import { hashToken, generateToken } from "@/lib/utils/token";
import type {
  Company,
  CompanyMember,
  Plan,
  Subscription,
  UsagePeriod,
  Job,
  Candidate,
  Application,
  AiScreeningResult,
  Assessment,
  AssessmentAttempt,
  VideoInterview,
  VideoInterviewAttempt,
  VideoResponse,
  PipelineEvent,
  Note,
  RejectionRecord,
  EmailTemplate,
  EmailLog,
  TeamInvitation,
  AuditLog,
  ApplicationStage,
  Recommendation,
  EmailTemplateType,
  AddonProduct,
  CompanyAddon,
} from "@/types/database";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_COMPANY_SLUG = "northwindlabs";

export const DEMO_USERS = {
  owner: { id: "u-owner", name: "Amara Chukwu", email: "amara@northwindlabs.com", role: "owner" as const },
  admin: { id: "u-admin", name: "David Okoro", email: "david@northwindlabs.com", role: "admin" as const },
  recruiter: { id: "u-recruiter", name: "Priya Nair", email: "priya@northwindlabs.com", role: "recruiter" as const },
  hiring_manager: { id: "u-hm", name: "James Whitfield", email: "james@northwindlabs.com", role: "hiring_manager" as const },
  reviewer: { id: "u-reviewer", name: "Grace Adeyemi", email: "grace@northwindlabs.com", role: "reviewer" as const },
};

const FIRST_NAMES = [
  "Chinedu", "Aisha", "Michael", "Fatima", "Tunde", "Sarah", "Emeka", "Ngozi", "Daniel", "Blessing",
  "Kelechi", "Yusuf", "Adaeze", "Femi", "Halima", "Ifeoma", "Segun", "Chioma", "Bola", "Ibrahim",
  "Victoria", "Obinna", "Zainab", "Wale",
];
const LAST_NAMES = [
  "Okafor", "Bello", "Adeyemi", "Musa", "Nwosu", "Balogun", "Eze", "Abubakar", "Uche", "Okonkwo",
  "Lawal", "Ibrahim", "Chukwu", "Afolabi", "Osei", "Mensah", "Onyekachi", "Adewale", "Sani", "Umeh",
];

function randomCandidateName() {
  return { first: pick(FIRST_NAMES), last: pick(LAST_NAMES) };
}

export const company: Company = {
  id: COMPANY_ID,
  name: "Northwind Labs",
  slug: DEMO_COMPANY_SLUG,
  logo_url: null,
  description:
    "Northwind Labs builds infrastructure tooling for fintechs across West Africa. We're a 90-person, fully-remote-friendly team headquartered in Lagos.",
  industry: "Software & Technology",
  size: "51-200",
  country: "Nigeria",
  city: "Lagos",
  website: "https://northwindlabs.com",
  contact_email: "careers@northwindlabs.com",
  brand_color: "#3730a3",
  timezone: "Africa/Lagos",
  career_page_status: "published",
  header_style: "gradient",
  social_links: { linkedin: "https://linkedin.com/company/northwindlabs", twitter: "https://x.com/northwindlabs" },
  recruitment_message:
    "We hire for craft and judgement over pedigree. Every application is read by a human before any decision is made.",
  show_company_details: true,
  created_at: daysAgo(180),
  updated_at: daysAgo(2),
};

export const companyMembers: CompanyMember[] = Object.values(DEMO_USERS).map((u, i) => ({
  id: `cm-${i}`,
  company_id: COMPANY_ID,
  user_id: u.id,
  full_name: u.name,
  email: u.email,
  role: u.role,
  status: "active",
  invited_by: i === 0 ? null : DEMO_USERS.owner.id,
  invited_at: i === 0 ? null : daysAgo(170),
  joined_at: daysAgo(170 - i * 5),
}));

const starterFeatures = [
  "Branded company career page", "Job creation and publishing", "Candidate application forms",
  "CV upload and applicant database", "AI CV screening", "Applicant pipeline", "Assessments",
  "Prerecorded video interviews", "Video transcription and AI analysis", "Qualified candidates section",
  "Rejection feedback drafts", "Email notifications and reminders",
];
const growthFeatures = [
  "Everything in Starter", "live_ai_interviewer", "Candidate comparison", "Adjustable CV screening criteria",
  "Custom email templates", "Advanced applicant filters", "Recruitment analytics",
  "Bulk assessment invitations", "Bulk video interview invitations", "Priority support",
];
const scaleFeatures = [
  "Everything in Growth", "live_ai_interviewer", "Bulk candidate actions", "Bulk stage movement",
  "Deeper recruitment analytics", "Priority AI processing", "Priority transcription",
  "Longer video retention", "Higher export limits", "Priority WhatsApp and email support",
];
const enterpriseFeatures = [
  "Everything in Scale", "live_ai_interviewer", "Multiple branches", "Recruitment agency workspaces",
  "Custom domains", "SSO", "Custom retention", "Dedicated onboarding", "Custom reporting",
  "Higher live AI interview usage",
];

function planPair(idPrefix: string, name: string, slug: Plan["slug"], monthlyAmount: number, limits: Plan["limits"], features: string[]): Plan[] {
  return [
    { id: `${idPrefix}-monthly`, name, slug, currency: "NGN", amount: monthlyAmount, interval: "monthly", paystack_plan_code: "", limits, features, active: true, created_at: daysAgo(365) },
    { id: `${idPrefix}-annual`, name, slug, currency: "NGN", amount: monthlyAmount * 10, interval: "annual", paystack_plan_code: "", limits, features, active: true, created_at: daysAgo(365) },
  ];
}

export const plans: Plan[] = [
  ...planPair("plan-starter", "Starter", "starter", 20000, { active_jobs: 5, applications: 300, team_members: 3 }, starterFeatures),
  ...planPair("plan-growth", "Growth", "growth", 50000, { active_jobs: 15, applications: 1500, team_members: 8 }, growthFeatures),
  ...planPair("plan-scale", "Scale", "scale", 100000, { active_jobs: 30, applications: 5000, team_members: 20 }, scaleFeatures),
  ...planPair("plan-enterprise", "Enterprise", "enterprise", 0, { active_jobs: 999999, applications: 999999, team_members: 999999 }, enterpriseFeatures),
];

export const addonProducts: AddonProduct[] = [
  { id: "addon-jobs-5", sku: "extra_jobs_5", name: "5 extra active jobs", kind: "active_jobs", billing_type: "recurring", quantity: 5, amount: 10000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-jobs-10", sku: "extra_jobs_10", name: "10 extra active jobs", kind: "active_jobs", billing_type: "recurring", quantity: 10, amount: 18000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-jobs-20", sku: "extra_jobs_20", name: "20 extra active jobs", kind: "active_jobs", billing_type: "recurring", quantity: 20, amount: 30000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-apps-500", sku: "extra_applications_500", name: "500 extra applications", kind: "applications", billing_type: "one_time", quantity: 500, amount: 15000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-apps-1000", sku: "extra_applications_1000", name: "1,000 extra applications", kind: "applications", billing_type: "one_time", quantity: 1000, amount: 25000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-apps-2500", sku: "extra_applications_2500", name: "2,500 extra applications", kind: "applications", billing_type: "one_time", quantity: 2500, amount: 50000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-apps-5000", sku: "extra_applications_5000", name: "5,000 extra applications", kind: "applications", billing_type: "one_time", quantity: 5000, amount: 85000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-team-3", sku: "extra_team_members_3", name: "3 extra team members", kind: "team_members", billing_type: "recurring", quantity: 3, amount: 5000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-team-10", sku: "extra_team_members_10", name: "10 extra team members", kind: "team_members", billing_type: "recurring", quantity: 10, amount: 15000, currency: "NGN", min_plan_slug: null, active: true, created_at: daysAgo(365) },
  { id: "addon-ai-10", sku: "live_ai_credits_10", name: "10 live AI interview credits", kind: "live_ai_interviews", billing_type: "one_time", quantity: 10, amount: 8000, currency: "NGN", min_plan_slug: "growth", active: true, created_at: daysAgo(365) },
  { id: "addon-ai-25", sku: "live_ai_credits_25", name: "25 live AI interview credits", kind: "live_ai_interviews", billing_type: "one_time", quantity: 25, amount: 18000, currency: "NGN", min_plan_slug: "growth", active: true, created_at: daysAgo(365) },
  { id: "addon-ai-50", sku: "live_ai_credits_50", name: "50 live AI interview credits", kind: "live_ai_interviews", billing_type: "one_time", quantity: 50, amount: 32000, currency: "NGN", min_plan_slug: "growth", active: true, created_at: daysAgo(365) },
];

export const companyAddons: CompanyAddon[] = [];

export const subscription: Subscription = {
  id: "sub-1",
  company_id: COMPANY_ID,
  plan_id: "plan-growth-monthly",
  paystack_customer_code: "CUS_demo123",
  paystack_subscription_code: "SUB_demo123",
  paystack_email_token: "demo-email-token",
  paystack_authorization_code: "AUTH_demo123",
  status: "active",
  period_start: daysAgo(12),
  period_end: daysFromNow(18),
  next_payment_date: daysFromNow(18),
  cancel_at_period_end: false,
  grace_period_end: null,
  canceled_at: null,
  cancellation_reason: null,
  created_at: daysAgo(170),
  updated_at: daysAgo(12),
};

export const usagePeriod: UsagePeriod = {
  id: "usage-1",
  company_id: COMPANY_ID,
  subscription_id: "sub-1",
  period_start: daysAgo(12),
  period_end: daysFromNow(18),
  applications: 42,
  live_ai_interview_credits: 10,
  storage_bytes: 480_000_000,
};

const defaultWeights = {
  required_skills: 30,
  relevant_experience: 25,
  transferable_experience: 15,
  education: 10,
  certifications: 5,
  achievements: 10,
  application_answers: 5,
};

export const jobs: Job[] = [
  {
    id: "job-backend",
    company_id: COMPANY_ID,
    created_by: DEMO_USERS.owner.id,
    title: "Senior Backend Engineer",
    slug: "senior-backend-engineer",
    department: "Engineering",
    location: "Lagos, Nigeria",
    work_arrangement: "hybrid",
    employment_type: "full_time",
    salary_min: 9000000,
    salary_max: 14000000,
    currency: "NGN",
    summary: "Own the payments ledger service that processes every transaction across our fintech customers.",
    description:
      "We're looking for a senior backend engineer to join the Payments Platform team. You'll design and operate the ledger and reconciliation services that our fintech customers depend on for correctness and uptime.",
    responsibilities: [
      "Design and evolve our double-entry ledger service",
      "Own reliability for payment reconciliation pipelines",
      "Mentor mid-level engineers on the team",
      "Partner with product on API design for new payment rails",
    ],
    required_skills: ["Python", "PostgreSQL", "Distributed systems", "API design"],
    preferred_skills: ["FastAPI", "Kafka", "Financial systems experience"],
    min_experience: 5,
    education_requirements: "Bachelor's degree in Computer Science or equivalent practical experience",
    other_requirements: ["Comfortable with on-call rotation"],
    application_questions: [
      { id: "q1", label: "Describe a distributed system you've operated in production.", type: "textarea", required: true },
      { id: "q2", label: "Are you comfortable with an on-call rotation?", type: "boolean", required: true },
    ],
    screening_weights: defaultWeights,
    openings_count: 2,
    closing_date: daysFromNow(21),
    status: "published",
    published_at: daysAgo(20),
    created_at: daysAgo(22),
    updated_at: daysAgo(20),
  },
  {
    id: "job-designer",
    company_id: COMPANY_ID,
    created_by: DEMO_USERS.owner.id,
    title: "Product Designer",
    slug: "product-designer",
    department: "Design",
    location: "Remote",
    work_arrangement: "remote",
    employment_type: "full_time",
    salary_min: 6000000,
    salary_max: 9500000,
    currency: "NGN",
    summary: "Shape the end-to-end experience of our merchant dashboard, from research through to shipped UI.",
    description:
      "As Product Designer you'll partner closely with engineering and product to define how merchants manage payments, disputes, and payouts inside our dashboard.",
    responsibilities: [
      "Lead design for the merchant dashboard workstream",
      "Run lightweight research with merchant customers",
      "Maintain and extend our design system",
    ],
    required_skills: ["Figma", "Interaction design", "Design systems"],
    preferred_skills: ["B2B SaaS experience", "Fintech experience"],
    min_experience: 3,
    education_requirements: null,
    other_requirements: [],
    application_questions: [
      { id: "q1", label: "Link to your portfolio", type: "text", required: true },
    ],
    screening_weights: defaultWeights,
    openings_count: 1,
    closing_date: daysFromNow(30),
    status: "published",
    published_at: daysAgo(15),
    created_at: daysAgo(17),
    updated_at: daysAgo(15),
  },
  {
    id: "job-csm",
    company_id: COMPANY_ID,
    created_by: DEMO_USERS.admin.id,
    title: "Customer Success Manager",
    slug: "customer-success-manager",
    department: "Customer Success",
    location: "Lagos, Nigeria",
    work_arrangement: "onsite",
    employment_type: "full_time",
    salary_min: 4500000,
    salary_max: 6500000,
    currency: "NGN",
    summary: "Be the primary point of contact for our top-tier fintech customers post-launch.",
    description:
      "You'll own the relationship with a portfolio of our largest customers, driving adoption and renewal.",
    responsibilities: ["Own onboarding for new enterprise customers", "Run quarterly business reviews", "Identify expansion opportunities"],
    required_skills: ["Account management", "Customer success", "Stakeholder communication"],
    preferred_skills: ["Fintech or payments background"],
    min_experience: 2,
    education_requirements: null,
    other_requirements: [],
    application_questions: [],
    screening_weights: defaultWeights,
    openings_count: 1,
    closing_date: daysFromNow(14),
    status: "published",
    published_at: daysAgo(10),
    created_at: daysAgo(11),
    updated_at: daysAgo(10),
  },
  {
    id: "job-sdr",
    company_id: COMPANY_ID,
    created_by: DEMO_USERS.admin.id,
    title: "Sales Development Representative",
    slug: "sales-development-representative",
    department: "Sales",
    location: "Remote",
    work_arrangement: "remote",
    employment_type: "full_time",
    salary_min: 3000000,
    salary_max: 4500000,
    currency: "NGN",
    summary: "Generate and qualify pipeline for the sales team.",
    description: "Draft — not yet published.",
    responsibilities: ["Prospect new accounts", "Qualify inbound leads"],
    required_skills: ["Cold outreach", "CRM hygiene"],
    preferred_skills: [],
    min_experience: 1,
    education_requirements: null,
    other_requirements: [],
    application_questions: [],
    screening_weights: defaultWeights,
    openings_count: 2,
    closing_date: null,
    status: "draft",
    published_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
];

// ---- Assessment & video interview definitions (job-backend only) ----

export const assessment: Assessment = {
  id: "assessment-backend",
  company_id: COMPANY_ID,
  job_id: "job-backend",
  title: "Backend Engineering Screen",
  instructions: "This assessment has 5 questions and should take about 25 minutes. You have one attempt.",
  duration_minutes: 30,
  pass_mark: 70,
  randomize_order: false,
  deadline_days: 5,
  status: "active",
  questions: [
    {
      id: "aq1", assessment_id: "assessment-backend", type: "multiple_choice",
      prompt: "Which statement about database transactions is correct?",
      options: [
        { id: "a", label: "READ COMMITTED prevents all phantom reads" },
        { id: "b", label: "SERIALIZABLE offers the strongest isolation but the most contention" },
        { id: "c", label: "Isolation level has no effect on locking behavior" },
        { id: "d", label: "Transactions are unnecessary for single-row writes" },
      ],
      correct_answer: ["b"], points: 10, section: "Databases", order_index: 0,
    },
    {
      id: "aq2", assessment_id: "assessment-backend", type: "multiple_choice",
      prompt: "In a double-entry ledger, every transaction must:",
      options: [
        { id: "a", label: "Sum to zero across debits and credits" },
        { id: "b", label: "Be reversible only by an admin" },
        { id: "c", label: "Always touch exactly two accounts" },
        { id: "d", label: "Be idempotent by default with no extra work" },
      ],
      correct_answer: ["a"], points: 10, section: "Domain", order_index: 1,
    },
    {
      id: "aq3", assessment_id: "assessment-backend", type: "written",
      prompt: "Describe how you would design idempotency keys for a payments API.",
      options: [], correct_answer: null, points: 20, section: "System Design", order_index: 2,
    },
    {
      id: "aq4", assessment_id: "assessment-backend", type: "multiple_choice",
      prompt: "Which of these best reduces reconciliation drift between two ledgers?",
      options: [
        { id: "a", label: "Nightly manual review only" },
        { id: "b", label: "Continuous automated matching with alerting on mismatch" },
        { id: "c", label: "Disabling retries entirely" },
        { id: "d", label: "Storing amounts as floating point" },
      ],
      correct_answer: ["b"], points: 10, section: "Domain", order_index: 3,
    },
    {
      id: "aq5", assessment_id: "assessment-backend", type: "written",
      prompt: "Tell us about a production incident you led the response for.",
      options: [], correct_answer: null, points: 20, section: "Experience", order_index: 4,
    },
  ],
};

export const videoInterview: VideoInterview = {
  id: "video-backend",
  company_id: COMPANY_ID,
  job_id: "job-backend",
  title: "Backend Engineering Video Interview",
  instructions: "Answer each question in one take. You'll have prep time before recording starts.",
  deadline_days: 7,
  status: "active",
  questions: [
    {
      id: "vq1", video_interview_id: "video-backend",
      prompt: "Walk us through the most complex distributed system you've operated in production.",
      prep_seconds: 30, response_seconds: 120, retries_allowed: true, max_retries: 1,
      scoring_criteria: ["Technical depth", "Clarity of explanation", "Ownership demonstrated"], order_index: 0,
    },
    {
      id: "vq2", video_interview_id: "video-backend",
      prompt: "Tell us about a time reconciliation or data integrity broke in a system you owned. What did you do?",
      prep_seconds: 30, response_seconds: 120, retries_allowed: true, max_retries: 1,
      scoring_criteria: ["Root-cause depth", "Ownership", "Communication under pressure"], order_index: 1,
    },
  ],
};

// ---- Candidates, applications, screening, pipeline, notes, rejections ----

interface SeedPlan {
  jobId: string;
  stage: ApplicationStage;
  daysAgoApplied: number;
}

const seedPlans: SeedPlan[] = [
  // job-backend
  { jobId: "job-backend", stage: "applied", daysAgoApplied: 1 },
  { jobId: "job-backend", stage: "applied", daysAgoApplied: 2 },
  { jobId: "job-backend", stage: "cv_screened", daysAgoApplied: 4 },
  { jobId: "job-backend", stage: "shortlisted", daysAgoApplied: 6 },
  { jobId: "job-backend", stage: "assessment", daysAgoApplied: 9 },
  { jobId: "job-backend", stage: "video_interview", daysAgoApplied: 12 },
  { jobId: "job-backend", stage: "qualified", daysAgoApplied: 18 },
  { jobId: "job-backend", stage: "rejected", daysAgoApplied: 15 },
  // job-designer
  { jobId: "job-designer", stage: "applied", daysAgoApplied: 1 },
  { jobId: "job-designer", stage: "applied", daysAgoApplied: 3 },
  { jobId: "job-designer", stage: "cv_screened", daysAgoApplied: 5 },
  { jobId: "job-designer", stage: "shortlisted", daysAgoApplied: 7 },
  { jobId: "job-designer", stage: "qualified", daysAgoApplied: 14 },
  { jobId: "job-designer", stage: "rejected", daysAgoApplied: 10 },
  // job-csm
  { jobId: "job-csm", stage: "applied", daysAgoApplied: 1 },
  { jobId: "job-csm", stage: "cv_screened", daysAgoApplied: 3 },
  { jobId: "job-csm", stage: "shortlisted", daysAgoApplied: 5 },
  { jobId: "job-csm", stage: "on_hold", daysAgoApplied: 8 },
  { jobId: "job-csm", stage: "qualified", daysAgoApplied: 12 },
];

const strengthsPool = [
  "Clear, structured communication", "Deep hands-on technical experience", "Strong ownership of past projects",
  "Directly relevant domain background", "Evidence of mentoring others", "Track record of measurable impact",
];
const concernsPool = [
  "Limited evidence of the specific required stack", "Career gaps not explained in the application",
  "Experience skews more junior than the role expects", "No direct evidence of the preferred domain background",
];

function stageRank(stage: ApplicationStage): number {
  const order: ApplicationStage[] = ["applied", "cv_screened", "shortlisted", "assessment", "video_interview", "qualified"];
  const idx = order.indexOf(stage);
  return idx === -1 ? order.length : idx;
}

export const candidates: Candidate[] = [];
export const applications: Application[] = [];
export const aiScreeningResults: AiScreeningResult[] = [];
export const assessmentAttempts: AssessmentAttempt[] = [];
export const videoInterviewAttempts: VideoInterviewAttempt[] = [];
export const videoResponses: VideoResponse[] = [];
export const pipelineEvents: PipelineEvent[] = [];
export const notes: Note[] = [];
export const rejectionRecords: RejectionRecord[] = [];

const stageHistory: ApplicationStage[] = ["applied", "cv_screened", "shortlisted", "assessment", "video_interview", "qualified"];

seedPlans.forEach((plan, index) => {
  const { first, last } = randomCandidateName();
  const job = jobs.find((j) => j.id === plan.jobId)!;
  const candidateId = `cand-${index}`;
  const applicationId = `app-${index}`;
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com`;

  candidates.push({
    id: candidateId,
    company_id: COMPANY_ID,
    first_name: first,
    last_name: last,
    email,
    phone: `+234801${randomInt(1000000, 9999999)}`,
    location: pick(["Lagos, Nigeria", "Abuja, Nigeria", "Remote", "Nairobi, Kenya", "Accra, Ghana"]),
    linkedin_url: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}`,
    portfolio_url: plan.jobId === "job-designer" ? `https://${first.toLowerCase()}${last.toLowerCase()}.design` : null,
    created_at: daysAgo(plan.daysAgoApplied),
  });

  const trackingToken = generateToken();
  const isTerminalReject = plan.stage === "rejected";
  const isTerminalHold = plan.stage === "on_hold";
  const recommendation: Recommendation | null =
    plan.stage === "applied"
      ? null
      : isTerminalReject
        ? "low_match"
        : plan.stage === "qualified"
          ? "strong_match"
          : pick<Recommendation>(["strong_match", "possible_match", "manual_review"]);

  applications.push({
    id: applicationId,
    company_id: COMPANY_ID,
    job_id: plan.jobId,
    candidate_id: candidateId,
    cv_path: `demo/cvs/${candidateId}.pdf`,
    cv_filename: `${first}-${last}-CV.pdf`,
    cv_text: `${first} ${last} — ${randomInt(2, 9)} years experience. Skills: ${pickMany(job.required_skills.concat(job.preferred_skills), 3).join(", ")}.`,
    cv_parse_status: "parsed",
    cover_note: index % 3 === 0 ? `I'm excited about the ${job.title} role because of Northwind's work in fintech infrastructure.` : null,
    application_answers: Object.fromEntries(job.application_questions.map((q) => [q.id, q.type === "boolean" ? "Yes" : "Sample answer describing relevant experience."])),
    stage: plan.stage,
    recommendation,
    assigned_member_id: plan.stage === "applied" ? null : pick([DEMO_USERS.recruiter.id, DEMO_USERS.hiring_manager.id]),
    tracking_token_hash: hashToken(trackingToken),
    applied_at: daysAgo(plan.daysAgoApplied),
    stage_updated_at: daysAgo(Math.max(0, plan.daysAgoApplied - 1)),
    rejected_at: isTerminalReject ? daysAgo(Math.max(0, plan.daysAgoApplied - 2)) : null,
    qualified_at: plan.stage === "qualified" ? daysAgo(Math.max(0, plan.daysAgoApplied - stageRank(plan.stage))) : null,
  });

  // Pipeline events: replay the stage history up to the current stage (or reject/hold branch)
  const rank = isTerminalReject || isTerminalHold ? stageRank("shortlisted") : stageRank(plan.stage);
  let from: ApplicationStage | null = null;
  for (let i = 0; i <= rank; i++) {
    const to = stageHistory[i];
    pipelineEvents.push({
      id: id(),
      company_id: COMPANY_ID,
      application_id: applicationId,
      from_stage: from,
      to_stage: to,
      changed_by: i === 0 ? null : DEMO_USERS.recruiter.id,
      source: i === 0 || to === "cv_screened" ? "system" : "recruiter",
      created_at: daysAgo(plan.daysAgoApplied - i),
    });
    from = to;
  }
  if (isTerminalReject || isTerminalHold) {
    pipelineEvents.push({
      id: id(),
      company_id: COMPANY_ID,
      application_id: applicationId,
      from_stage: from,
      to_stage: plan.stage,
      changed_by: DEMO_USERS.recruiter.id,
      source: "recruiter",
      created_at: daysAgo(Math.max(0, plan.daysAgoApplied - rank - 1)),
    });
  }

  // AI screening result for anything past "applied"
  if (plan.stage !== "applied") {
    const overall = isTerminalReject ? randomInt(25, 45) : plan.stage === "qualified" ? randomInt(78, 96) : randomInt(55, 90);
    aiScreeningResults.push({
      id: id(),
      application_id: applicationId,
      overall_score: overall,
      skills_match: Math.min(100, overall + randomInt(-10, 10)),
      experience_match: Math.min(100, overall + randomInt(-10, 10)),
      education_match: job.education_requirements ? randomInt(60, 100) : null,
      transferable_skills: pickMany(job.preferred_skills.length ? job.preferred_skills : job.required_skills, Math.min(2, job.required_skills.length)),
      matched_requirements: pickMany(job.required_skills, Math.max(1, job.required_skills.length - (isTerminalReject ? 2 : 0))),
      missing_minimum_requirements: isTerminalReject ? pickMany(job.required_skills, 1) : [],
      missing_preferred_requirements: pickMany(job.preferred_skills, isTerminalReject ? job.preferred_skills.length : 1),
      strengths: pickMany(strengthsPool, 2),
      concerns: isTerminalReject ? pickMany(concernsPool, 2) : pickMany(concernsPool, 1),
      achievements: [`Delivered a measurable improvement in a previous ${job.department.toLowerCase()} role`],
      uncertainty_notes: index % 4 === 0 ? ["CV formatting made the employment timeline partly ambiguous."] : [],
      explanation: isTerminalReject
        ? `${first} shows relevant background but is missing evidence for ${pickMany(job.required_skills, 1)[0]}, a stated minimum requirement, and the overall experience level reads below what the role expects.`
        : `${first} demonstrates strong alignment with the role's core requirements, with clear evidence of ${pickMany(job.required_skills, 1)[0]} and related experience. ${plan.stage === "qualified" ? "Interview and assessment evidence reinforced the CV signal." : "Some areas would benefit from clarification in a screening call."}`,
      recommendation: isTerminalReject ? "low_match" : plan.stage === "qualified" ? "strong_match" : recommendation ?? "possible_match",
      review_state: isTerminalReject ? "recruiter_rejected" : plan.stage === "qualified" ? "recruiter_approved_shortlist" : "ai_screening_complete",
      manual_override: null,
      model_version: "gpt-4o-mini",
      prompt_version: "v1",
      created_at: daysAgo(Math.max(0, plan.daysAgoApplied - 1)),
    });
  }

  // Assessment attempt (job-backend only, stage >= assessment)
  if (plan.jobId === "job-backend" && stageRank(plan.stage) >= stageRank("assessment") && !isTerminalReject) {
    const score = randomInt(65, 95);
    assessmentAttempts.push({
      id: id(),
      assessment_id: assessment.id,
      application_id: applicationId,
      token_hash: hashToken(generateToken()),
      starts_at: null,
      expires_at: daysFromNow(2),
      started_at: daysAgo(plan.daysAgoApplied - 6),
      completed_at: daysAgo(plan.daysAgoApplied - 6),
      answers: { aq1: "b", aq2: "a", aq3: "Use a client-supplied idempotency key stored with the request hash...", aq4: "b", aq5: "During a reconciliation drift incident I led triage across three services..." },
      score,
      section_scores: { Databases: 10, Domain: 20, "System Design": Math.round(score * 0.2), Experience: Math.round(score * 0.2) },
      passed: score >= assessment.pass_mark,
      status: "completed",
    });
  }

  // Video interview attempt + responses (job-backend only, stage >= video_interview)
  if (plan.jobId === "job-backend" && stageRank(plan.stage) >= stageRank("video_interview") && !isTerminalReject) {
    const attemptId = `video-attempt-${index}`;
    videoInterviewAttempts.push({
      id: attemptId,
      video_interview_id: videoInterview.id,
      application_id: applicationId,
      token_hash: hashToken(generateToken()),
      expires_at: daysFromNow(2),
      started_at: daysAgo(plan.daysAgoApplied - 10),
      completed_at: daysAgo(plan.daysAgoApplied - 10),
      status: "completed",
    });
    videoInterview.questions.forEach((q, qi) => {
      const vScore = randomInt(60, 95);
      videoResponses.push({
        id: id(),
        attempt_id: attemptId,
        question_id: q.id,
        storage_path: `demo/videos/${attemptId}/${q.id}.webm`,
        duration_seconds: randomInt(60, q.response_seconds),
        transcript: `${first} explains their approach to ${qi === 0 ? "operating a distributed ledger system" : "resolving a reconciliation incident"}, walking through the technical decisions and trade-offs involved.`,
        transcript_status: "complete",
        ai_score: vScore,
        ai_analysis: {
          evidence: [`Referenced direct ownership of a production ${qi === 0 ? "ledger" : "reconciliation"} system`],
          strengths: pickMany(strengthsPool, 2),
          concerns: pickMany(concernsPool, 1),
          missing_detail: qi === 1 ? ["Did not quantify the impact of the incident"] : [],
          summary: `Substantive, role-relevant answer with ${vScore >= 80 ? "strong" : "adequate"} technical depth.`,
        },
        employer_score: null,
        created_at: daysAgo(plan.daysAgoApplied - 10),
      });
    });
  }

  // Notes on a subset
  if (index % 3 === 1) {
    notes.push({
      id: id(),
      company_id: COMPANY_ID,
      application_id: applicationId,
      author_id: DEMO_USERS.recruiter.id,
      author_name: DEMO_USERS.recruiter.name,
      body: "Spoke briefly on LinkedIn — confirmed continued interest in the role.",
      created_at: daysAgo(Math.max(0, plan.daysAgoApplied - 2)),
      updated_at: daysAgo(Math.max(0, plan.daysAgoApplied - 2)),
    });
  }

  // Rejection record for rejected applications
  if (isTerminalReject) {
    const aiDraft = `Thank you for applying for the ${job.title} role at Northwind Labs. After careful review, we've decided not to move forward at this time. Your application was strong, but other candidates demonstrated closer alignment with ${pickMany(job.required_skills, 1)[0]}, a core requirement for this role. We'd encourage you to apply again as you build more direct experience in this area.`;
    rejectionRecords.push({
      id: id(),
      company_id: COMPANY_ID,
      application_id: applicationId,
      rejected_by: DEMO_USERS.recruiter.id,
      stage: "shortlisted",
      internal_reason: "Missing minimum requirement evidence after CV screening.",
      ai_draft: aiDraft,
      final_message: aiDraft,
      feedback_mode: "concise",
      email_log_id: null,
      created_at: daysAgo(Math.max(0, plan.daysAgoApplied - 2)),
    });
  }
});

usagePeriod.applications = applications.length;

// ---- Email templates (defaults) ----

export const templateDefaults: { type: EmailTemplateType; subject: string; body: string }[] = [
  { type: "application_received", subject: "We've received your application for {{role}}", body: "Hi {{first_name}},\n\nThanks for applying to {{role}} at {{company}}. We'll be in touch as soon as we've reviewed your application." },
  { type: "application_under_review", subject: "Your application for {{role}} is under review", body: "Hi {{first_name}},\n\nYour application for {{role}} is currently being reviewed by our team." },
  { type: "assessment_invitation", subject: "Complete your assessment for {{role}}", body: "Hi {{first_name}},\n\nAs a next step for {{role}}, please complete this short assessment: {{link}}" },
  { type: "assessment_reminder_1", subject: "Reminder: your {{role}} assessment is waiting", body: "Hi {{first_name}},\n\nJust a reminder to complete your assessment before the deadline: {{link}}" },
  { type: "assessment_reminder_2", subject: "Final reminder: {{role}} assessment closes soon", body: "Hi {{first_name}},\n\nYour assessment link closes soon: {{link}}" },
  { type: "assessment_completed", subject: "Assessment received — {{role}}", body: "Hi {{first_name}},\n\nThanks for completing your assessment. Our team will review it shortly." },
  { type: "video_interview_invitation", subject: "Record your video interview for {{role}}", body: "Hi {{first_name}},\n\nPlease complete your video interview here: {{link}}" },
  { type: "video_interview_reminder", subject: "Reminder: video interview for {{role}}", body: "Hi {{first_name}},\n\nYour video interview link is still open: {{link}}" },
  { type: "video_interview_completed", subject: "Video interview received — {{role}}", body: "Hi {{first_name}},\n\nThanks for completing your video interview." },
  { type: "shortlisted", subject: "You've been shortlisted for {{role}}", body: "Hi {{first_name}},\n\nGreat news — you've been shortlisted for {{role}}. We'll follow up with next steps shortly." },
  { type: "on_hold", subject: "Update on your application for {{role}}", body: "Hi {{first_name}},\n\nYour application for {{role}} is currently on hold while we finalize hiring plans." },
  { type: "rejection", subject: "Update on your application for {{role}} at {{company}}", body: "Hi {{first_name}},\n\nThank you for applying for {{role}}. {{reason}}" },
  { type: "qualified", subject: "You're through to the next stage for {{role}}", body: "Hi {{first_name}},\n\nCongratulations — you've been marked as qualified for {{role}}." },
  { type: "tracking_link_reminder", subject: "Track your application for {{role}}", body: "Hi {{first_name}},\n\nYou can check your application status any time: {{link}}" },
  { type: "team_invitation", subject: "You've been invited to join {{company}} on RecruitCandidates", body: "Hi,\n\n{{inviter}} has invited you to join {{company}}'s hiring workspace. Accept here: {{link}}" },
];

export const emailTemplates: EmailTemplate[] = templateDefaults.map((t, i) => ({
  id: `template-${i}`,
  company_id: COMPANY_ID,
  type: t.type,
  subject: t.subject,
  body: t.body,
  signature: "The Northwind Labs Hiring Team",
  reply_to: "careers@northwindlabs.com",
  sender_display_name: "Northwind Labs Careers",
  enabled: true,
  version: 1,
}));

export const emailLogs: EmailLog[] = applications.slice(0, 12).map((app, i) => ({
  id: `email-${i}`,
  company_id: COMPANY_ID,
  application_id: app.id,
  type: "application_received",
  recipient: candidates.find((c) => c.id === app.candidate_id)!.email,
  subject: `We've received your application for ${jobs.find((j) => j.id === app.job_id)!.title}`,
  status: "delivered",
  resend_id: `re_demo_${i}`,
  scheduled_for: null,
  sent_at: app.applied_at,
  delivered_at: app.applied_at,
  failure_reason: null,
  created_by: null,
  template_version: 1,
}));

export const teamInvitations: TeamInvitation[] = [
  {
    id: "invite-1",
    company_id: COMPANY_ID,
    email: "kemi.oduya@example.com",
    role: "reviewer",
    token_hash: hashToken(generateToken()),
    invited_by: DEMO_USERS.owner.id,
    expires_at: daysFromNow(5),
    accepted_at: null,
    status: "pending",
  },
];

export const auditLogs: AuditLog[] = [
  { id: id(), company_id: COMPANY_ID, actor_user_id: DEMO_USERS.owner.id, actor_name: DEMO_USERS.owner.name, action: "job.published", entity_type: "job", entity_id: "job-backend", metadata: {}, ip: "102.89.23.10", created_at: daysAgo(20) },
  { id: id(), company_id: COMPANY_ID, actor_user_id: DEMO_USERS.recruiter.id, actor_name: DEMO_USERS.recruiter.name, action: "candidate.shortlisted", entity_type: "application", entity_id: applications[3]?.id ?? "app-3", metadata: {}, ip: "102.89.23.11", created_at: daysAgo(6) },
  { id: id(), company_id: COMPANY_ID, actor_user_id: DEMO_USERS.admin.id, actor_name: DEMO_USERS.admin.name, action: "team.invited", entity_type: "team_invitation", entity_id: "invite-1", metadata: { email: "kemi.oduya@example.com" }, ip: "102.89.23.12", created_at: daysAgo(3) },
];
