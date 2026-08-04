import type { ChipTone } from "@/components/ui/status-chip";
import type {
  ApplicationStage,
  AttemptStatus,
  CvParseStatus,
  EmailStatus,
  JobStatus,
  Recommendation,
  ScreeningReviewState,
  SubscriptionStatus,
} from "@/types/database";

interface StatusMeta {
  label: string;
  tone: ChipTone;
}

export const jobStatusMap: Record<JobStatus, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
};

export const stageMap: Record<ApplicationStage, StatusMeta> = {
  applied: { label: "Applied", tone: "neutral" },
  cv_screened: { label: "CV Screened", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "accent" },
  assessment: { label: "Assessment", tone: "info" },
  video_interview: { label: "Video Interview", tone: "info" },
  qualified: { label: "Qualified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  on_hold: { label: "On Hold", tone: "warning" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export const recommendationMap: Record<Recommendation, StatusMeta> = {
  strong_match: { label: "Strong match", tone: "success" },
  possible_match: { label: "Possible match", tone: "accent" },
  manual_review: { label: "Needs manual review", tone: "warning" },
  low_match: { label: "Low match", tone: "danger" },
};

export const reviewStateMap: Record<ScreeningReviewState, StatusMeta> = {
  ai_screening_complete: { label: "AI screening complete", tone: "info" },
  manual_review_required: { label: "Manual review required", tone: "warning" },
  recruiter_approved_shortlist: { label: "Approved for shortlist", tone: "success" },
  recruiter_rejected: { label: "Rejected", tone: "danger" },
  screening_failed: { label: "Screening failed", tone: "danger" },
  cv_unreadable: { label: "CV unreadable", tone: "warning" },
};

export const cvParseStatusMap: Record<CvParseStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "neutral" },
  parsed: { label: "Parsed", tone: "success" },
  unreadable: { label: "Unreadable", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export const subscriptionStatusMap: Record<SubscriptionStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  attention: { label: "Needs attention", tone: "warning" },
  non_renewing: { label: "Non-renewing", tone: "warning" },
  past_due: { label: "Past due", tone: "danger" },
  canceled: { label: "Canceled", tone: "danger" },
  completed: { label: "Completed", tone: "neutral" },
  trialing: { label: "Trial", tone: "info" },
};

export const attemptStatusMap: Record<AttemptStatus, StatusMeta> = {
  pending: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  expired: { label: "Expired", tone: "danger" },
};

export const emailStatusMap: Record<EmailStatus, StatusMeta> = {
  scheduled: { label: "Scheduled", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  canceled: { label: "Canceled", tone: "neutral" },
};
