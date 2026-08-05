// Shared domain types mirroring the Supabase schema in /supabase/migrations.
// These are the single source of truth for shapes used by both the mock
// (demo mode) and live (Supabase) service branches, so switching branches
// never requires touching UI code.

export type CompanyRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "reviewer";
export type MemberStatus = "invited" | "active" | "suspended";
export type CareerPageStatus = "unpublished" | "published";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  contact_email: string | null;
  brand_color: string;
  timezone: string;
  career_page_status: CareerPageStatus;
  header_style: "gradient" | "solid" | "image";
  social_links: { linkedin?: string; twitter?: string; facebook?: string };
  recruitment_message: string | null;
  show_company_details: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: CompanyRole;
  status: MemberStatus;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
}

export interface PlanLimits {
  active_jobs: number;
  applications: number;
  team_members: number;
}

export type PlanSlug = "starter" | "growth" | "scale" | "enterprise";

export interface Plan {
  id: string;
  name: string;
  slug: PlanSlug;
  currency: string;
  amount: number;
  interval: "monthly" | "annual";
  paystack_plan_code: string;
  limits: PlanLimits;
  features: string[];
  active: boolean;
  created_at: string;
}

export type AddonKind = "active_jobs" | "applications" | "team_members" | "live_ai_interviews";
export type AddonBillingType = "recurring" | "one_time";

export interface AddonProduct {
  id: string;
  sku: string;
  name: string;
  kind: AddonKind;
  billing_type: AddonBillingType;
  quantity: number;
  amount: number;
  currency: string;
  min_plan_slug: PlanSlug | null;
  active: boolean;
  created_at: string;
}

export type CompanyAddonStatus = "active" | "canceled" | "expired";

export interface CompanyAddon {
  id: string;
  company_id: string;
  addon_product_id: string;
  sku: string;
  quantity: number;
  billing_type: AddonBillingType;
  status: CompanyAddonStatus;
  period_start: string;
  period_end: string | null;
  paystack_reference: string | null;
  created_at: string;
}

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "attention"
  | "non_renewing"
  | "past_due"
  | "canceled"
  | "completed"
  | "trialing";

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_email_token: string | null;
  paystack_authorization_code: string | null;
  status: SubscriptionStatus;
  period_start: string;
  period_end: string;
  next_payment_date: string | null;
  cancel_at_period_end: boolean;
  grace_period_end: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionEvent {
  id: string;
  event_key: string;
  event_type: string;
  company_id: string | null;
  subscription_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string | null;
  processing_status: "pending" | "processed" | "failed";
  error: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  subscription_id: string | null;
  paystack_reference: string;
  paystack_transaction_id: string | null;
  amount: number;
  currency: string;
  status: "success" | "failed" | "abandoned";
  paid_at: string | null;
  metadata: Record<string, unknown>;
}

export interface UsagePeriod {
  id: string;
  company_id: string;
  subscription_id: string;
  period_start: string;
  period_end: string;
  applications: number;
  live_ai_interview_credits: number;
  storage_bytes: number;
}

export type JobStatus = "draft" | "published" | "paused" | "closed" | "archived";
export type WorkArrangement = "onsite" | "hybrid" | "remote";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "temporary";

export interface ApplicationQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "boolean";
  options?: string[];
  required: boolean;
}

export interface ScreeningWeights {
  required_skills: number;
  relevant_experience: number;
  transferable_experience: number;
  education: number;
  certifications: number;
  achievements: number;
  application_answers: number;
}

export interface Job {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  work_arrangement: WorkArrangement;
  employment_type: EmploymentType;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  summary: string;
  description: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  min_experience: number | null;
  education_requirements: string | null;
  other_requirements: string[];
  application_questions: ApplicationQuestion[];
  screening_weights: ScreeningWeights;
  openings_count: number;
  closing_date: string | null;
  status: JobStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  created_at: string;
}

export type ApplicationStage =
  | "applied"
  | "cv_screened"
  | "shortlisted"
  | "assessment"
  | "video_interview"
  | "qualified"
  | "rejected"
  | "on_hold"
  | "withdrawn";

export type Recommendation = "strong_match" | "possible_match" | "manual_review" | "low_match";
export type CvParseStatus = "pending" | "parsed" | "unreadable" | "failed";

export interface Application {
  id: string;
  company_id: string;
  job_id: string;
  candidate_id: string;
  cv_path: string;
  cv_filename: string;
  cv_text: string | null;
  cv_parse_status: CvParseStatus;
  cover_note: string | null;
  application_answers: Record<string, string>;
  stage: ApplicationStage;
  recommendation: Recommendation | null;
  assigned_member_id: string | null;
  tracking_token_hash: string;
  applied_at: string;
  stage_updated_at: string;
  rejected_at: string | null;
  qualified_at: string | null;
}

export type ScreeningReviewState =
  | "ai_screening_complete"
  | "manual_review_required"
  | "recruiter_approved_shortlist"
  | "recruiter_rejected"
  | "screening_failed"
  | "cv_unreadable";

export interface AiScreeningResult {
  id: string;
  application_id: string;
  overall_score: number;
  skills_match: number;
  experience_match: number;
  education_match: number | null;
  transferable_skills: string[];
  matched_requirements: string[];
  missing_minimum_requirements: string[];
  missing_preferred_requirements: string[];
  strengths: string[];
  concerns: string[];
  achievements: string[];
  uncertainty_notes: string[];
  explanation: string;
  recommendation: Recommendation;
  review_state: ScreeningReviewState;
  manual_override: Recommendation | null;
  model_version: string;
  prompt_version: string;
  created_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  type: "multiple_choice" | "written";
  prompt: string;
  options: { id: string; label: string }[];
  correct_answer: string[] | null;
  points: number;
  section: string;
  order_index: number;
}

export interface Assessment {
  id: string;
  company_id: string;
  job_id: string;
  title: string;
  instructions: string;
  duration_minutes: number;
  pass_mark: number;
  randomize_order: boolean;
  deadline_days: number;
  status: "draft" | "active" | "archived";
  questions: AssessmentQuestion[];
}

export type AttemptStatus = "pending" | "in_progress" | "completed" | "expired";

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  application_id: string;
  token_hash: string;
  starts_at: string | null;
  expires_at: string;
  started_at: string | null;
  completed_at: string | null;
  answers: Record<string, string | string[]>;
  score: number | null;
  section_scores: Record<string, number>;
  passed: boolean | null;
  status: AttemptStatus;
}

export interface VideoQuestion {
  id: string;
  video_interview_id: string;
  prompt: string;
  prep_seconds: number;
  response_seconds: number;
  retries_allowed: boolean;
  max_retries: number;
  scoring_criteria: string[];
  order_index: number;
}

export interface VideoInterview {
  id: string;
  company_id: string;
  job_id: string;
  title: string;
  instructions: string;
  deadline_days: number;
  status: "draft" | "active" | "archived";
  questions: VideoQuestion[];
}

export interface VideoInterviewAttempt {
  id: string;
  video_interview_id: string;
  application_id: string;
  token_hash: string;
  expires_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: AttemptStatus;
}

export type TranscriptStatus = "pending" | "processing" | "complete" | "failed";

export interface VideoResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  storage_path: string;
  duration_seconds: number;
  transcript: string | null;
  transcript_status: TranscriptStatus;
  ai_score: number | null;
  ai_analysis: {
    evidence: string[];
    strengths: string[];
    concerns: string[];
    missing_detail: string[];
    summary: string;
  } | null;
  employer_score: number | null;
  created_at: string;
}

export interface PipelineEvent {
  id: string;
  company_id: string;
  application_id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  changed_by: string | null;
  source: "system" | "recruiter" | "ai";
  created_at: string;
}

export interface Note {
  id: string;
  company_id: string;
  application_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export type FeedbackMode = "concise" | "detailed" | "none";

export interface RejectionRecord {
  id: string;
  company_id: string;
  application_id: string;
  rejected_by: string;
  stage: ApplicationStage;
  internal_reason: string;
  ai_draft: string;
  final_message: string;
  feedback_mode: FeedbackMode;
  email_log_id: string | null;
  created_at: string;
}

export type EmailTemplateType =
  | "application_received"
  | "application_under_review"
  | "assessment_invitation"
  | "assessment_reminder_1"
  | "assessment_reminder_2"
  | "assessment_completed"
  | "video_interview_invitation"
  | "video_interview_reminder"
  | "video_interview_completed"
  | "shortlisted"
  | "on_hold"
  | "rejection"
  | "qualified"
  | "tracking_link_reminder"
  | "team_invitation";

export interface EmailTemplate {
  id: string;
  company_id: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  signature: string;
  reply_to: string | null;
  sender_display_name: string | null;
  enabled: boolean;
  version: number;
}

export type EmailStatus = "scheduled" | "sent" | "delivered" | "failed" | "canceled";

export interface EmailLog {
  id: string;
  company_id: string;
  application_id: string | null;
  type:
    | EmailTemplateType
    | "new_application"
    | "high_match_candidate"
    | "usage_threshold"
    | "payment_failed"
    | "subscription_canceled"
    | "card_expiring"
    | "password_reset"
    | "email_verification"
    | "welcome"
    | "admin_new_signup_notification"
    | "support_request";
  recipient: string;
  subject: string;
  status: EmailStatus;
  resend_id: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failure_reason: string | null;
  created_by: string | null;
  template_version: number | null;
}

export interface TeamInvitation {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  token_hash: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export interface AuditLog {
  id: string;
  company_id: string;
  actor_user_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}
