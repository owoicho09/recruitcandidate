import * as fixtures from "@/lib/data/fixtures";
import type {
  Company, CompanyMember, Plan, Subscription, UsagePeriod, Job, Candidate, Application,
  AiScreeningResult, Assessment, AssessmentAttempt, VideoInterview, VideoInterviewAttempt,
  VideoResponse, PipelineEvent, Note, RejectionRecord, EmailTemplate, EmailLog, TeamInvitation, AuditLog,
  SubscriptionEvent, Payment, AddonProduct, CompanyAddon,
} from "@/types/database";

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  /** Plain-text in demo mode only — see the warning in `seed()` below. */
  passwordHash: string;
  companyId: string;
  role: CompanyMember["role"];
  emailVerified: boolean;
}

export interface MockPasswordReset {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface MockStore {
  users: MockUser[];
  passwordResets: MockPasswordReset[];
  companies: Company[];
  companyMembers: CompanyMember[];
  plans: Plan[];
  subscriptions: Subscription[];
  usagePeriods: UsagePeriod[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  aiScreeningResults: AiScreeningResult[];
  assessments: Assessment[];
  assessmentAttempts: AssessmentAttempt[];
  videoInterviews: VideoInterview[];
  videoInterviewAttempts: VideoInterviewAttempt[];
  videoResponses: VideoResponse[];
  pipelineEvents: PipelineEvent[];
  notes: Note[];
  rejectionRecords: RejectionRecord[];
  emailTemplates: EmailTemplate[];
  emailLogs: EmailLog[];
  teamInvitations: TeamInvitation[];
  auditLogs: AuditLog[];
  subscriptionEvents: SubscriptionEvent[];
  payments: Payment[];
  addonProducts: AddonProduct[];
  companyAddons: CompanyAddon[];
}

function seed(): MockStore {
  const demoUsers: MockUser[] = Object.values(fixtures.DEMO_USERS).map((u) => ({
    id: u.id,
    fullName: u.name,
    email: u.email,
    // Demo accounts all share the password "demopass" — clearly a scaffold, never used outside DEMO_MODE.
    passwordHash: "demopass",
    companyId: fixtures.company.id,
    role: u.role,
    emailVerified: true,
  }));

  return {
    users: demoUsers,
    passwordResets: [],
    companies: [fixtures.company],
    companyMembers: [...fixtures.companyMembers],
    plans: [...fixtures.plans],
    subscriptions: [fixtures.subscription],
    usagePeriods: [fixtures.usagePeriod],
    jobs: [...fixtures.jobs],
    candidates: [...fixtures.candidates],
    applications: [...fixtures.applications],
    aiScreeningResults: [...fixtures.aiScreeningResults],
    assessments: [fixtures.assessment],
    assessmentAttempts: [...fixtures.assessmentAttempts],
    videoInterviews: [fixtures.videoInterview],
    videoInterviewAttempts: [...fixtures.videoInterviewAttempts],
    videoResponses: [...fixtures.videoResponses],
    pipelineEvents: [...fixtures.pipelineEvents],
    notes: [...fixtures.notes],
    rejectionRecords: [...fixtures.rejectionRecords],
    emailTemplates: [...fixtures.emailTemplates],
    emailLogs: [...fixtures.emailLogs],
    teamInvitations: [...fixtures.teamInvitations],
    auditLogs: [...fixtures.auditLogs],
    subscriptionEvents: [],
    payments: [
      {
        id: "payment-1",
        company_id: fixtures.company.id,
        subscription_id: "sub-1",
        paystack_reference: "demo_ref_initial",
        paystack_transaction_id: "demo_txn_1",
        amount: fixtures.plans.find((p) => p.slug === "growth")!.amount,
        currency: "NGN",
        status: "success",
        paid_at: fixtures.subscription.created_at,
        metadata: {},
      },
    ],
    addonProducts: [...fixtures.addonProducts],
    companyAddons: [...fixtures.companyAddons],
  };
}

// Survive Next.js dev-server module re-evaluation (Fast Refresh / Turbopack HMR)
// by caching the store on globalThis, the same pattern used for Prisma clients.
const globalForStore = globalThis as unknown as { __recruitCandidatesStore?: MockStore };

export const mockStore: MockStore = globalForStore.__recruitCandidatesStore ?? seed();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__recruitCandidatesStore = mockStore;
}
