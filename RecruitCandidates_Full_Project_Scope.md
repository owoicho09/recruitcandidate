# RecruitCandidates — End-to-End Product & Build Scope

## 1. Product Definition

**Product name:** RecruitCandidates  
**Product type:** Multi-tenant AI recruitment SaaS  
**Primary users:** HR teams, hiring managers, internal recruiters, and recruitment agencies  
**Core promise:** Give every company a branded recruitment page and a complete system for collecting applications, screening CVs, assessing candidates, conducting asynchronous video interviews, and presenting vetted candidates by role.

RecruitCandidates is not a general HR management platform. It does not include payroll, leave management, attendance, employee records, onboarding, background checks, or offer-letter management.

The product ends at helping a company produce a clear, reviewable pool of qualified candidates for each role.

---

## 2. Core Product Outcome

A company should be able to:

1. Create an account and company workspace.
2. Choose and pay for a subscription.
3. Upload its logo and customize its recruitment page.
4. Create and publish job openings.
5. Receive applications and CV uploads.
6. Screen every CV against the specific job requirements.
7. Review AI screening results without relying on rigid keyword matching.
8. Shortlist candidates.
9. Send assessments and asynchronous video interviews through email.
10. Receive completed assessments and video responses.
11. Read transcripts and AI analysis.
12. Watch candidate video responses directly.
13. Move candidates into a vetted/qualified section for each role.
14. Send respectful rejection messages that explain the job-related reasons for the decision.
15. Manage the entire process from one employer/recruiter workspace.

---

## 3. Product Architecture

The system has three layers:

### 3.1 Public Product Website

The marketing and acquisition website for RecruitCandidates.

### 3.2 Employer/Recruiter Workspace

The authenticated SaaS product used by each company.

### 3.3 Candidate Journey

Candidates do not need a full account or dashboard. They interact through public career pages, secure token-based links, forms, assessments, video interview pages, tracking pages, and email communication.

### 3.4 Platform Admin

A separate high-privilege console used by the RecruitCandidates owner to manage companies, subscriptions, usage, payments, and platform activity.

---

## 4. Recommended Technology Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Framer Motion for premium marketing interactions
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Resend for transactional and scheduled emails
- OpenAI for semantic CV analysis, transcription, interview analysis, summaries, and rejection explanation drafting
- Paystack for recurring subscriptions
- React Hook Form
- Zod
- dnd-kit for Kanban interaction
- Vercel for deployment

The new system should be created in a clean repository. Reuse proven KoreLabs patterns where useful, but do not carry over its single-company assumptions, shared admin password, legacy cron queue, offer-letter flow, interview-slot system, or hardcoded jobs.

---

# PART A — PUBLIC WEBSITE

## 5. Public Website Pages

### 5.1 Home Page `/`

The homepage must communicate the outcome immediately.

#### Hero

Headline direction:

> Turn applications into a vetted shortlist.

Supporting copy:

> RecruitCandidates gives your company a branded career page, screens every application against the role, manages assessments and video interviews, and presents qualified candidates in one workspace.

Primary CTA:
- Start hiring
- Create your career page

Secondary CTA:
- See how it works

Hero visual:
- Premium mockup of the employer dashboard
- Career page preview
- Candidate scorecard
- Qualified candidates panel

#### Trust/Outcome Strip

Show concise outcomes:

- Branded career page
- AI-assisted CV screening
- Assessments
- Video interviews
- Vetted candidates by role

#### How It Works

1. Create and publish a role.
2. Candidates apply through your career page.
3. RecruitCandidates screens, assesses, and interviews.
4. Your team reviews the strongest candidates.

#### Career Page Section

Explain that companies without a website receive a proper recruitment page.

Example URL:

`recruitcandidates.com/acme/careers`

Show:
- Company logo
- Company description
- Open roles
- Individual job pages
- Application flow

#### AI Screening Section

Explain that the screening is based on meaning and role fit, not exact keyword matching.

Show:
- Relevant skills
- Transferable experience
- Missing requirements
- Strengths
- Human-readable explanation

#### Video Interview Section

Show:
- Employer-defined questions
- Secure candidate link
- Browser recording
- Transcript
- Question-level score
- Video playback
- AI summary

#### Qualified Candidates Section

Show the final outcome:
- Vetted candidates grouped by role
- CV score
- Assessment score
- Interview score
- Strengths
- Concerns
- Recommendation
- Video playback

#### Pricing Preview

Display plan cards with usage limits and CTA.

#### FAQ

Include:
- Do candidates need an account?
- Can we use this without a company website?
- Does AI automatically reject candidates?
- Can we watch the interviews?
- Can we customize the career page?
- How are candidates scored?
- What happens when we reach our plan limit?
- Can recruitment agencies use it?
- Does RecruitCandidates send rejection feedback?
- Is applicant information separated between companies?

#### Final CTA

> Build your recruitment page and start receiving qualified candidates.

---

### 5.2 Features Page `/features`

Sections:
- Branded career pages
- Job creation and publishing
- Candidate applications
- Semantic CV screening
- Assessments
- Asynchronous video interviews
- Transcription and AI interview analysis
- Applicant database
- Hiring pipeline
- Qualified candidates
- Candidate comparison
- Rejection explanations
- Email automation
- Team collaboration
- Usage and subscription management

---

### 5.3 Pricing Page `/pricing`

Display monthly and annual plans.

Each plan should show:
- Price
- Active job limit
- Monthly application limit
- AI screening allowance
- Assessment allowance
- Video interview allowance
- Team member limit
- Storage/retention allowance
- Branding options
- Candidate comparison availability
- Support level

Include:
- “What counts as an application?”
- “What happens when I reach a limit?”
- “Can I upgrade immediately?”
- “What happens after cancellation?”
- “Are unused limits carried over?”
- “Are Paystack fees included?”

---

### 5.4 How It Works `/how-it-works`

Visual end-to-end journey:

Company signs up  
→ creates company page  
→ publishes a role  
→ candidates apply  
→ AI screens CVs  
→ recruiter reviews and shortlists  
→ assessment sent  
→ video interview sent  
→ responses transcribed and analysed  
→ qualified candidates displayed by role

---

### 5.5 Demo Page `/demo`

Interactive or recorded product walkthrough.

Sections:
- Employer dashboard
- Career page
- Job creation
- Application
- Screening report
- Video interview
- Qualified candidate view

CTA:
- Start free trial or subscribe
- Book onboarding support

---

### 5.6 Contact Page `/contact`

Fields:
- Name
- Work email
- Company
- Team size
- Hiring volume
- Message

---

### 5.7 Authentication Pages

- `/signup`
- `/login`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/accept-invite`

---

### 5.8 Legal Pages

- `/privacy`
- `/terms`
- `/data-processing`
- `/acceptable-use`
- `/cookie-policy`

Privacy documentation must cover CVs, application answers, recordings, transcripts, AI-generated assessments, retention, deletion, and data-controller/data-processor responsibilities.

---

# PART B — COMPANY ONBOARDING

## 6. Signup and Workspace Creation

### Step 1 — User Account

Collect:
- First name
- Last name
- Work email
- Password
- Email verification

### Step 2 — Company Information

Collect:
- Company name
- Unique workspace slug
- Company logo, optional
- Company description
- Industry
- Company size
- Country
- State/city
- Contact email
- Website, optional
- Brand accent color
- Time zone

### Step 3 — Plan Selection

Show:
- Plan
- Price
- Limits
- Billing interval
- Trial terms, if enabled

### Step 4 — Paystack Checkout

Initialize payment from the server using the selected Paystack plan code.

### Step 5 — Workspace Activation

After verified payment/subscription confirmation:
- Mark subscription active.
- Create company membership with owner role.
- Create default pipeline stages.
- Create default email templates.
- Create default career page settings.
- Redirect to onboarding checklist.

### Onboarding Checklist

- Upload logo
- Complete company information
- Preview career page
- Create first job
- Add assessment questions
- Add video interview questions
- Publish role
- Copy career page link

---

# PART C — EMPLOYER/RECRUITER WORKSPACE

## 7. Workspace Navigation

Recommended primary navigation:

- Overview
- Jobs
- Applicants
- Pipeline
- Qualified
- Career Page
- Team
- Email Templates
- Billing
- Settings

---

## 8. Overview Dashboard `/dashboard`

Cards:
- Active jobs
- Total applications this month
- Awaiting AI screening
- Awaiting recruiter review
- Shortlisted candidates
- Assessments pending
- Video interviews pending
- Qualified candidates
- Plan usage

Panels:
- Recent applications
- Roles with most applications
- Candidates awaiting action
- Stuck candidates
- Recent completed video interviews
- Subscription status
- Usage warnings

Quick actions:
- Create job
- View qualified candidates
- Copy career page
- Invite team member

---

## 9. Career Page Management `/dashboard/career-page`

Company controls:
- Upload/change logo
- Company description
- Brand accent color
- Header style
- Location
- Website
- Social links
- Contact information
- Recruitment message
- Hide/show company details
- Preview desktop/mobile
- Publish/unpublish career page

Public URL:

`recruitcandidates.com/[companySlug]/careers`

Each company owns and controls its page content while the platform hosts it.

Optional later feature:
- Custom domain, such as `careers.company.com`

---

## 10. Public Career Page

### Company Career Page

Route:

`/[companySlug]/careers`

Contains:
- Company branding
- Company description
- Open roles
- Department filter
- Location filter
- Employment-type filter
- Search
- “No role fits?” talent pool form, optional

### Job Page

Route:

`/[companySlug]/careers/[jobSlug]`

Contains:
- Job title
- Department
- Location
- Work arrangement
- Employment type
- Salary range, optional
- Job summary
- Responsibilities
- Required skills
- Preferred skills
- Experience expectations
- Education, where applicable
- Benefits, optional
- Closing date
- Apply button
- Share link

### Application Page

Route:

`/[companySlug]/apply/[jobSlug]`

Fields:
- First name
- Last name
- Email
- Phone
- Location
- LinkedIn URL, optional
- Portfolio URL, optional
- CV upload
- Cover note, optional
- Dynamic application questions
- Consent checkbox
- Privacy acknowledgement

Candidate should not need an account.

---

## 11. Job Management `/dashboard/jobs`

### Job List

Display:
- Job title
- Status
- Department
- Location
- Applications
- Shortlisted
- Qualified
- Closing date
- Created by
- Last updated

Actions:
- Create
- Edit
- Preview
- Publish
- Pause
- Close
- Duplicate
- Copy public link
- Archive

### Job Creation

Fields:
- Title
- Slug
- Department
- Location
- Remote/hybrid/onsite
- Employment type
- Salary range, optional
- Summary
- Description
- Responsibilities
- Required skills
- Preferred skills
- Minimum experience
- Education requirements
- Other minimum requirements
- Application questions
- Closing date
- Openings count
- Screening rubric
- Assessment configuration
- Video interview configuration

### Screening Rubric

Employer can weight:
- Required skills
- Relevant experience
- Transferable experience
- Education
- Certifications
- Achievements
- Application answers

Weights must total 100%.

The UI should explain that screening scores assist review and do not make final decisions.

---

## 12. Applicant Database `/dashboard/applicants`

Display:
- Candidate
- Role
- Application date
- CV score
- Assessment score
- Video interview score
- Current stage
- Recommendation
- Assigned recruiter

Search and filters:
- Name/email
- Job
- Stage
- Score range
- Skills
- Experience
- Location
- Recommendation
- Application date
- Assigned team member

Views:
- Table
- Compact cards
- Saved filters, later

Bulk actions:
- Send assessment
- Send video interview
- Move stage
- Reject
- Put on hold
- Assign recruiter
- Export selected, plan-dependent

---

## 13. Candidate Detail

Tabs:

### Profile
- Contact information
- Application answers
- LinkedIn
- Portfolio
- Role applied for
- Application date

### CV
- Secure CV preview
- Download permission
- Extracted CV text status

### AI Screening
- Overall match score
- Skills match
- Experience match
- Education relevance
- Transferable skills
- Achievements
- Strengths
- Missing requirements
- Concerns
- Screening explanation
- Recommendation
- Manual override
- “Mark for human review”

### Assessment
- Score
- Completion time
- Question-by-question breakdown
- Section scores
- Pass threshold

### Video Interview
- Video player for every answer
- Question text
- Transcript
- Question-level score
- Strengths
- Concerns
- AI notes
- Employer notes

### Timeline
- Application submitted
- Emails sent
- Stage changes
- Assessment started/completed
- Video invitation
- Video submitted
- Rejection or qualification

### Notes
- Internal notes
- Author
- Timestamp
- Mentions, later

### Actions
- Shortlist
- Send assessment
- Send video interview
- Move to qualified
- Put on hold
- Reject
- Assign team member

---

# PART D — AI CV SCREENING

## 14. Screening Principles

The screening system must not be a rigid keyword filter.

It should use structured semantic analysis to understand:
- Similar job titles
- Equivalent technologies
- Related responsibilities
- Transferable experience
- Career progression
- Relevant achievements
- Sector context
- Application answers
- Minimum requirements
- Preferred requirements

Example:
- “Client acquisition” can be relevant to “business development.”
- “Account management” can support “customer success.”
- “FastAPI” experience can be relevant to a role mentioning Python API frameworks.

### Screening Safeguards

The model must:
- Ignore name, age, gender, ethnicity, religion, photo, marital status, disability, and other protected or irrelevant traits.
- Avoid using address/location unless location is an explicit job requirement.
- Never infer personality from CV writing style.
- Never reject solely because exact keywords are absent.
- Separate minimum requirements from preferred requirements.
- Flag uncertainty.
- Produce a human-readable explanation.
- Never automatically send a rejection without an employer-confirmed rule or human action.
- Keep the employer responsible for the final decision.

### Screening Output Schema

- overall_score: 0–100
- skills_match: 0–100
- experience_match: 0–100
- education_match: 0–100 or null
- transferable_skills: string[]
- matched_requirements: string[]
- missing_minimum_requirements: string[]
- missing_preferred_requirements: string[]
- strengths: string[]
- concerns: string[]
- achievements: string[]
- uncertainty_notes: string[]
- explanation: string
- recommendation: strong_match | possible_match | manual_review | low_match
- model_version
- prompt_version
- created_at

### Human Review States

- AI screening complete
- Manual review required
- Recruiter approved shortlist
- Recruiter rejected
- Screening failed
- CV unreadable

Scanned or unreadable CVs should be flagged for manual review instead of rejected.

---

# PART E — ASSESSMENTS

## 15. Assessment Builder

Employer can:
- Create role-specific assessments
- Add multiple-choice questions
- Add optional written questions
- Set correct answers
- Set points
- Group questions into sections
- Set duration
- Set pass mark
- Set deadline
- Randomize question order, optional
- Allow one attempt by default

### Candidate Assessment Flow

Secure token route:

`/assessment/[token]`

Candidate sees:
- Company branding
- Role title
- Instructions
- Timer
- Questions
- Progress
- Submit confirmation

The candidate receives the link through Resend.

### Assessment Result

Store:
- Answers
- Score
- Section scores
- Started at
- Completed at
- Duration
- Passed
- Integrity flags, if any
- Expired status

---

# PART F — VIDEO INTERVIEWS

## 16. Video Interview Builder

Employer can:
- Add multiple questions
- Reorder questions
- Set preparation time
- Set response time
- Allow/disallow retries
- Set maximum retry count
- Set deadline
- Add introduction/instructions
- Set scoring criteria
- Preview candidate experience

### Candidate Video Flow

Secure token route:

`/video-interview/[token]`

Steps:
1. Verify token and deadline.
2. Show company branding and role.
3. Accept recording consent.
4. Test camera and microphone.
5. Display interview instructions.
6. Show question.
7. Preparation countdown.
8. Record response.
9. Review response if permitted.
10. Upload directly to private storage.
11. Repeat for all questions.
12. Submit complete interview.
13. Send confirmation email.

Videos should upload directly from browser to private Supabase Storage through signed upload URLs.

### AI Processing

After each or all videos upload:
- Extract audio.
- Transcribe.
- Analyse answer against:
  - Question
  - Job requirements
  - Employer scoring rubric
- Generate:
  - Question score
  - Relevant evidence
  - Strengths
  - Concerns
  - Missing detail
  - Summary
- Generate overall interview score and recommendation.

### Interview Analysis Safeguards

Do not score:
- Accent
- Appearance
- Facial features
- Perceived gender
- Ethnicity
- Disability
- Emotional expression
- Eye contact
- Background/environment
- “Confidence” inferred from voice style

Score the substance and job relevance of the spoken answer.

### Employer Review

Employer can:
- Watch every response
- Read transcript
- Correct transcript, optional
- View question-level analysis
- Add notes
- Override AI score
- Move candidate forward or reject

---

# PART G — PIPELINE AND QUALIFIED CANDIDATES

## 17. Hiring Pipeline `/dashboard/pipeline`

Default stages:

1. Applied
2. CV Screened
3. Shortlisted
4. Assessment
5. Video Interview
6. Qualified

Secondary statuses:
- Rejected
- On Hold
- Withdrawn

Use a Kanban board and allow drag-and-drop.

Each card shows:
- Candidate
- Job
- Current score
- Days in stage
- Pending action
- Assigned recruiter

Stage transitions should create timeline events.

### Automatic Stage Movement

Allowed:
- Application submitted → Applied
- AI screening completed → CV Screened
- Assessment completed → Assessment remains complete and awaits human review
- Video interview completed → Video Interview complete and awaits human review

Human-confirmed:
- Shortlisted
- Qualified
- Rejected
- On hold

The product should not automatically mark a candidate qualified or rejected solely from AI output.

---

## 18. Qualified Candidates `/dashboard/qualified`

This is a key product outcome.

The page should group candidates by job role.

For each role:
- Number qualified
- Openings count
- Date last updated
- Candidate comparison

Each qualified candidate card includes:
- Candidate name
- CV score
- Assessment score
- Video score
- Combined review score
- Key skills
- Relevant experience
- Strengths
- Concerns
- Recruiter notes
- Video playback
- Transcript
- Profile link

Actions:
- Compare candidates
- Remove from qualified
- Export summary, later
- Share review link, later

There is no offer or hiring-document workflow in the initial product.

---

# PART H — REJECTION FEEDBACK

## 19. Rejection Workflow

Rejecting a candidate should open a confirmation modal.

Fields:
- Candidate
- Role
- Rejection stage
- Internal rejection reason
- Send email toggle
- Feedback mode:
  - Concise
  - Detailed
  - No detailed feedback
- Editable email preview

### AI-Generated Rejection Explanation

The AI drafts a respectful explanation based only on verified job-related information.

Possible reasons:
- Missing a stated minimum requirement
- Experience did not align closely enough with the role
- Stronger evidence was needed for a required skill
- Assessment score did not meet the employer’s threshold
- Video response did not demonstrate enough role-specific evidence
- Other candidates aligned more closely with the published criteria

The message must:
- Be respectful
- Mention the exact role
- Avoid insulting or absolute language
- Avoid disclosing other candidates’ private information
- Avoid protected traits
- Avoid unsupported claims
- Avoid exposing internal numeric AI scores unless the employer chooses
- Avoid saying “the AI rejected you”
- State that the decision was based on the role criteria and application evidence
- Optionally suggest what could strengthen a future application

### Rejection Guardrails

- Employer must approve/edit the message before send, at least in MVP.
- The system must not invent a reason.
- If there is insufficient evidence for meaningful feedback, send a neutral rejection.
- Store the reason, final sent copy, approver, and timestamp.
- Allow company-wide default tone and signature.
- Allow opt-out of detailed feedback for legal or operational reasons.

### Example Structure

Subject:
`Update on your application for [Role] at [Company]`

Body:
- Thank candidate.
- Confirm role.
- State decision.
- Explain 1–2 job-related gaps.
- Mention a positive where appropriate.
- Close respectfully.

---

# PART I — EMAIL SYSTEM

## 20. Resend Email Events

Candidate-facing emails:
- Application received
- Application under review
- Assessment invitation
- Assessment reminder 1
- Assessment reminder 2
- Assessment completed
- Video interview invitation
- Video interview reminder
- Video interview completed
- Shortlisted
- Put on hold
- Rejection with approved feedback
- Qualified/next-step notice, optional
- Tracking link reminder

Employer-facing emails:
- New application
- High-match candidate, optional
- Assessment completed
- Video interview completed
- Candidate awaiting review
- Usage threshold reached
- Payment failed
- Subscription canceled
- Card expiring
- Team invitation

### Scheduled Email Logic

Use Resend scheduled email delivery for nudges and reminders.

Store the Resend email ID for every scheduled message.

When a candidate completes a step early:
- Cancel pending assessment nudges.
- Cancel pending video reminders.

Do not rebuild the old polling/cron email architecture.

### Email Log

Store:
- company_id
- candidate/application_id
- type
- recipient
- subject
- status
- resend_id
- scheduled_for
- sent_at
- delivered_at
- failure reason
- created_by
- template version

### Company Templates

Each company gets default templates.

Editable fields:
- Subject
- Body
- Signature
- Reply-to email
- Sender display name

Custom sending domains can be a later/enterprise feature.

---

# PART J — TEAM, AUTH, AND PERMISSIONS

## 21. Authentication

Use Supabase Auth:
- Email/password
- Email verification
- Password reset
- Optional magic link
- Invite flow

### Roles

#### Owner
Full company access, billing, settings, team, deletion.

#### Admin
All recruitment operations and company settings, excluding ownership transfer.

#### Recruiter
Jobs, applicants, pipeline, assessments, videos, notes, email actions.

#### Hiring Manager
Assigned jobs and candidates, reviews, notes, qualification decisions.

#### Reviewer
Read/review assigned candidates and add notes.

### Permission Requirements

All tenant-owned records include `company_id`.

Use Supabase RLS to enforce company isolation.

Membership is determined through `company_members`.

Never rely only on client-side hiding.

Service-role access is only allowed in trusted server-side routes and background processing.

---

# PART K — PAYSTACK SUBSCRIPTIONS

## 22. Plan Structure

Recommended launch plans:

### Starter — ₦20,000/month

- 3 active jobs
- 200 applications/month
- 200 AI CV screenings/month
- 30 assessment invitations/month
- 20 video interview candidates/month
- 2 team members
- Branded RecruitCandidates career page
- Standard email templates
- 3-month video retention

### Growth — ₦50,000/month

- 10 active jobs
- 1,000 applications/month
- 1,000 AI CV screenings/month
- 200 assessment invitations/month
- 100 video interview candidates/month
- 5 team members
- Candidate comparison
- Adjustable screening weights
- Editable email templates
- 12-month video retention

### Pro — ₦100,000/month

- 30 active jobs
- 5,000 applications/month
- 5,000 AI CV screenings/month
- 1,000 assessment invitations/month
- 500 video interview candidates/month
- 15 team members
- Advanced analytics
- Priority processing
- Longer retention
- Custom branding controls
- Priority support

### Enterprise

- Custom usage
- Recruitment agency/client workspaces
- Custom domain
- SSO
- Custom retention
- Dedicated support
- Custom contract

Exact limits should be configurable in the database, not hardcoded into UI logic.

---

## 23. Paystack Plan Configuration

Create corresponding monthly plans in Paystack.

Store plan codes in environment variables or the plans table.

Recommended approach:
- Environment variables provide initial plan-code mapping.
- Database `plans` table remains source of truth for display and limits.
- Every plan row stores Paystack plan code, interval, currency, amount, limits, and active status.

### First Subscription Flow

1. User selects a plan.
2. Server validates selected internal plan.
3. Server initializes a Paystack transaction with:
   - customer email
   - Paystack plan code
   - unique reference
   - callback URL
   - metadata containing company_id, user_id, and internal plan_id
4. User completes Paystack checkout.
5. Callback page does not activate access by itself.
6. Server verifies the transaction.
7. Paystack webhook remains the authoritative subscription event source.
8. On verified payment/subscription:
   - Upsert customer code
   - Upsert subscription code
   - Store authorization metadata where allowed
   - Mark subscription active
   - Set billing period
   - Reset usage counters
   - Unlock workspace

### Paystack Events to Handle

- `charge.success`
- `subscription.create`
- `invoice.create`
- `invoice.update`
- `invoice.payment_failed`
- `subscription.not_renew`
- `subscription.disable`
- `subscription.expiring_cards`

### Webhook Security

- Read raw request body.
- Validate `x-paystack-signature` using HMAC SHA-512 and the secret key.
- Reject invalid signatures.
- Ensure event processing is idempotent.
- Store event ID/hash.
- Return success promptly.
- Move expensive processing outside the immediate webhook path.

### Subscription Statuses

Internal statuses:
- pending
- active
- attention
- non_renewing
- past_due
- canceled
- completed
- trialing, only if implemented

### Access Rules

#### Active
Full plan access.

#### Attention/Past Due
- Display payment warning.
- Allow read access.
- Block creation of new jobs, invitations, or AI processing after grace period.
- Provide update-payment action.

#### Non-renewing
Continue access until current period end.

#### Canceled/Disabled
- Workspace becomes read-only.
- Career page jobs are unpublished or application intake is paused after grace period.
- Retain data according to retention policy.
- Allow reactivation.

### Failed Payment Logic

- Mark subscription attention/past_due.
- Send payment-failed email.
- Display dashboard banner.
- Generate Paystack subscription management link.
- Allow a configurable grace period, for example 3 days.
- After grace period, block metered actions.
- Do not delete company data immediately.

### Cancellation Logic

- Owner clicks cancel.
- Confirm consequences.
- Trigger Paystack cancellation/management flow.
- Mark non-renewing.
- Maintain access until period end.
- At disable event, move to canceled/read-only.
- Store canceled_at and cancellation reason.

### Upgrade Logic

For MVP:
- User chooses new plan.
- Start a new verified subscription or use approved Paystack plan-management method.
- Activate new limits only after confirmed payment.
- Cancel/non-renew old subscription safely.
- Prevent duplicate active subscriptions.

### Downgrade Logic

- Schedule downgrade for next billing cycle.
- Warn if current usage exceeds new limits.
- Do not delete jobs/applicants.
- Prevent new activity above downgraded limits after effective date.

### Usage Enforcement

Before every metered action:
- Resolve active subscription.
- Resolve plan limits.
- Read current-period usage.
- Reject or upsell when limit reached.
- Increment usage atomically only when action succeeds.

Meter:
- Active jobs
- New applications
- AI CV screenings
- Assessment invitations
- Video interview candidates
- Team members
- Storage/video duration, optional

Use database transactions or atomic RPC functions to avoid race conditions.

### Usage Reset

Reset counters on a confirmed successful renewal and create a new usage period record.

Never reset only because the calendar month changed; align usage with the subscription billing period.

---

# PART L — DATABASE MODEL

## 24. Core Tables

### users/profile
Supabase Auth user plus profile metadata.

### companies
- id
- name
- slug
- logo_url
- description
- industry
- size
- country
- city
- website
- contact_email
- brand_color
- timezone
- career_page_status
- created_at
- updated_at

### company_members
- id
- company_id
- user_id
- role
- status
- invited_by
- invited_at
- joined_at

### plans
- id
- name
- slug
- currency
- amount
- interval
- paystack_plan_code
- limits jsonb
- features jsonb
- active
- created_at

### subscriptions
- id
- company_id
- plan_id
- paystack_customer_code
- paystack_subscription_code
- paystack_email_token
- status
- period_start
- period_end
- next_payment_date
- cancel_at_period_end
- grace_period_end
- created_at
- updated_at

### subscription_events
- id
- event_key/hash
- event_type
- company_id
- subscription_id
- payload jsonb
- processed_at
- processing_status
- error

### payments
- id
- company_id
- subscription_id
- paystack_reference
- paystack_transaction_id
- amount
- currency
- status
- paid_at
- metadata jsonb

### usage_periods
- id
- company_id
- subscription_id
- period_start
- period_end
- active_jobs
- applications
- ai_screenings
- assessment_invitations
- video_interview_candidates
- team_members
- storage_bytes

### jobs
- id
- company_id
- created_by
- title
- slug
- department
- location
- work_arrangement
- employment_type
- salary_min
- salary_max
- currency
- summary
- description
- responsibilities[]
- required_skills[]
- preferred_skills[]
- min_experience
- education_requirements
- other_requirements[]
- application_questions jsonb
- screening_weights jsonb
- openings_count
- closing_date
- status
- published_at
- created_at
- updated_at

### candidates
- id
- company_id
- first_name
- last_name
- email
- phone
- location
- linkedin_url
- portfolio_url
- created_at

### applications
- id
- company_id
- job_id
- candidate_id
- cv_path
- cv_filename
- cv_text
- cv_parse_status
- cover_note
- application_answers jsonb
- stage
- recommendation
- assigned_member_id
- tracking_token_hash
- applied_at
- stage_updated_at
- rejected_at
- qualified_at

### ai_screening_results
Fields from the screening output schema plus application_id, prompt version, model version, and manual override.

### assessments
- id
- company_id
- job_id
- title
- instructions
- duration_minutes
- pass_mark
- status

### assessment_questions
- id
- assessment_id
- type
- prompt
- options jsonb
- correct_answer jsonb
- points
- section
- order_index

### assessment_attempts
- id
- assessment_id
- application_id
- token_hash
- starts_at
- expires_at
- started_at
- completed_at
- answers jsonb
- score
- section_scores jsonb
- passed
- status

### video_interviews
- id
- company_id
- job_id
- title
- instructions
- deadline_days
- status

### video_questions
- id
- video_interview_id
- prompt
- prep_seconds
- response_seconds
- retries_allowed
- max_retries
- scoring_criteria jsonb
- order_index

### video_interview_attempts
- id
- video_interview_id
- application_id
- token_hash
- expires_at
- started_at
- completed_at
- status

### video_responses
- id
- attempt_id
- question_id
- storage_path
- duration_seconds
- transcript
- transcript_status
- ai_score
- ai_analysis jsonb
- employer_score
- created_at

### pipeline_events
- id
- company_id
- application_id
- from_stage
- to_stage
- changed_by
- source
- created_at

### notes
- id
- company_id
- application_id
- author_id
- body
- created_at
- updated_at

### rejection_records
- id
- company_id
- application_id
- rejected_by
- stage
- internal_reason
- ai_draft
- final_message
- feedback_mode
- email_log_id
- created_at

### email_templates
- id
- company_id
- type
- subject
- body
- signature
- enabled
- version

### email_logs
Fields described in the email section.

### team_invitations
- id
- company_id
- email
- role
- token_hash
- invited_by
- expires_at
- accepted_at
- status

### audit_logs
- id
- company_id
- actor_user_id
- action
- entity_type
- entity_id
- metadata jsonb
- ip
- created_at

---

# PART M — ROUTING

## 25. Route Map

### Public
- `/`
- `/features`
- `/pricing`
- `/how-it-works`
- `/demo`
- `/contact`
- `/privacy`
- `/terms`
- `/data-processing`

### Auth
- `/signup`
- `/login`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/accept-invite`

### Company Workspace
- `/dashboard`
- `/dashboard/jobs`
- `/dashboard/jobs/new`
- `/dashboard/jobs/[id]`
- `/dashboard/jobs/[id]/edit`
- `/dashboard/jobs/[id]/applicants`
- `/dashboard/applicants`
- `/dashboard/applicants/[id]`
- `/dashboard/pipeline`
- `/dashboard/qualified`
- `/dashboard/career-page`
- `/dashboard/team`
- `/dashboard/email-templates`
- `/dashboard/billing`
- `/dashboard/settings`

### Candidate
- `/[companySlug]/careers`
- `/[companySlug]/careers/[jobSlug]`
- `/[companySlug]/apply/[jobSlug]`
- `/application/track/[token]`
- `/assessment/[token]`
- `/video-interview/[token]`

### Platform Admin
- `/platform-admin`
- `/platform-admin/companies`
- `/platform-admin/companies/[id]`
- `/platform-admin/users`
- `/platform-admin/subscriptions`
- `/platform-admin/payments`
- `/platform-admin/usage`
- `/platform-admin/jobs`
- `/platform-admin/applications`
- `/platform-admin/system`

### API
Organize under:
- `/api/auth/*`
- `/api/companies/*`
- `/api/jobs/*`
- `/api/applications/*`
- `/api/screening/*`
- `/api/assessments/*`
- `/api/video-interviews/*`
- `/api/pipeline/*`
- `/api/qualified/*`
- `/api/rejections/*`
- `/api/emails/*`
- `/api/team/*`
- `/api/billing/*`
- `/api/webhooks/paystack`
- `/api/webhooks/resend`
- `/api/platform-admin/*`

---

# PART N — PLATFORM ADMIN

## 26. Platform Admin Scope

Dashboard:
- Total companies
- Active subscriptions
- MRR
- New subscriptions
- Failed payments
- Applications processed
- AI screenings
- Video interviews
- Storage usage
- Email volume
- Recent errors

Company management:
- View company
- View owner
- View plan
- View usage
- Suspend/restore
- Change plan manually
- Grant temporary limits
- View billing events
- View audit events

Subscription management:
- Active
- Attention
- Non-renewing
- Canceled
- Failed invoices
- Expiring cards

System health:
- Failed CV parsing
- Failed AI screening
- Failed transcription
- Failed email
- Failed webhook
- Storage errors

Admin access must be separate from company membership and strongly protected.

---

# PART O — ENVIRONMENT VARIABLES

## 27. `.env.example`

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=RecruitCandidates
APP_DOMAIN=recruitcandidates.com
APP_ENCRYPTION_KEY=
TOKEN_HASH_SECRET=
INTERNAL_JOB_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=

# Storage
SUPABASE_CV_BUCKET=cvs
SUPABASE_VIDEO_BUCKET=videos
SUPABASE_LOGO_BUCKET=company-logos
MAX_CV_FILE_MB=10
MAX_VIDEO_FILE_MB=250
DEFAULT_VIDEO_RETENTION_DAYS=90

# Resend
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM_NAME=RecruitCandidates
EMAIL_FROM_ADDRESS=notifications@recruitcandidates.com
EMAIL_REPLY_TO=support@recruitcandidates.com
EMAIL_SUPPORT_ADDRESS=support@recruitcandidates.com
EMAIL_ADMIN_NOTIFY=
ASSESSMENT_REMINDER_1_HOURS=48
ASSESSMENT_REMINDER_2_HOURS=120
VIDEO_REMINDER_1_HOURS=48
VIDEO_REMINDER_2_HOURS=120

# OpenAI
OPENAI_API_KEY=
OPENAI_SCREENING_MODEL=
OPENAI_INTERVIEW_MODEL=
OPENAI_TRANSCRIPTION_MODEL=
OPENAI_EMAIL_MODEL=
OPENAI_REQUEST_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=2
AI_SCREENING_PROMPT_VERSION=v1
AI_INTERVIEW_PROMPT_VERSION=v1
AI_REJECTION_PROMPT_VERSION=v1

# Paystack
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=http://localhost:3000/dashboard/billing/callback
PAYSTACK_WEBHOOK_URL=http://localhost:3000/api/webhooks/paystack
PAYSTACK_CURRENCY=NGN
PAYSTACK_STARTER_MONTHLY_PLAN_CODE=
PAYSTACK_GROWTH_MONTHLY_PLAN_CODE=
PAYSTACK_PRO_MONTHLY_PLAN_CODE=
PAYSTACK_STARTER_ANNUAL_PLAN_CODE=
PAYSTACK_GROWTH_ANNUAL_PLAN_CODE=
PAYSTACK_PRO_ANNUAL_PLAN_CODE=
PAYMENT_GRACE_PERIOD_DAYS=3

# Plan defaults
STARTER_ACTIVE_JOBS_LIMIT=3
STARTER_APPLICATIONS_LIMIT=200
STARTER_AI_SCREENINGS_LIMIT=200
STARTER_ASSESSMENT_INVITES_LIMIT=30
STARTER_VIDEO_INTERVIEWS_LIMIT=20
STARTER_TEAM_MEMBERS_LIMIT=2

GROWTH_ACTIVE_JOBS_LIMIT=10
GROWTH_APPLICATIONS_LIMIT=1000
GROWTH_AI_SCREENINGS_LIMIT=1000
GROWTH_ASSESSMENT_INVITES_LIMIT=200
GROWTH_VIDEO_INTERVIEWS_LIMIT=100
GROWTH_TEAM_MEMBERS_LIMIT=5

PRO_ACTIVE_JOBS_LIMIT=30
PRO_APPLICATIONS_LIMIT=5000
PRO_AI_SCREENINGS_LIMIT=5000
PRO_ASSESSMENT_INVITES_LIMIT=1000
PRO_VIDEO_INTERVIEWS_LIMIT=500
PRO_TEAM_MEMBERS_LIMIT=15

# Security
PLATFORM_ADMIN_EMAIL=
PLATFORM_ADMIN_SESSION_SECRET=
RATE_LIMIT_SECRET=
AUTH_COOKIE_NAME=recruitcandidates_session
SESSION_TTL_HOURS=8
SIGNED_URL_TTL_SECONDS=3600
CANDIDATE_TOKEN_TTL_DAYS=14

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
LOG_LEVEL=info
```

Rules:
- Never expose secret keys through `NEXT_PUBLIC_*`.
- Validate required variables at startup.
- Create a typed environment module.
- Fail clearly in development.
- Gracefully disable optional integrations only where the product can safely continue.
- Never silently run billing without Paystack configuration.

---

# PART P — PREMIUM PRODUCT DESIGN

## 28. Visual Direction

RecruitCandidates should feel:
- Premium
- Calm
- Trustworthy
- Modern
- Clear
- Operational, not futuristic
- Human-centered, not “AI gimmick”

Use:
- Strong typography
- Spacious layouts
- Soft neutral backgrounds
- One confident accent color
- Clean cards
- Clear status chips
- Excellent tables
- Smooth but restrained animation
- Consistent loading and empty states
- Mobile-responsive public pages
- Desktop-optimized recruiter workspace

Avoid:
- Excessive gradients
- Robot illustrations
- Neon AI visuals
- Dense dashboards
- Unexplained scores
- Generic template appearance

### Required UI States

Every page needs:
- Loading
- Empty
- Error
- Success
- Permission denied
- Limit reached
- Subscription inactive
- No search results

---

# PART Q — SECURITY, PRIVACY, AND RELIABILITY

## 29. Required Controls

- RLS on every exposed tenant table
- Private CV and video buckets
- Time-limited signed URLs
- Hashed candidate tokens
- Rate limiting on public applications
- File type and file size validation
- Malware scanning hook-ready architecture
- Webhook signature validation
- Idempotent payment and email webhook processing
- Audit logs for sensitive employer actions
- Data export and deletion workflow
- Consent for recordings
- Retention controls
- No sensitive candidate data in client logs
- No service-role key in browser
- No cross-tenant queries without platform-admin authorization

### Tenant Isolation Acceptance Test

A user from Company A must be unable to:
- Read Company B jobs in dashboard APIs
- Read Company B applications
- Generate Company B signed CV URLs
- Watch Company B videos
- View Company B notes
- Trigger Company B emails
- Change Company B subscription
- Guess Company B candidate tokens

---

# PART R — BACKGROUND PROCESSING

## 30. Processing Jobs

Background work is required for:
- CV extraction
- AI screening
- Transcription
- Interview analysis
- Bulk emails
- Large exports
- Storage cleanup

Each job needs:
- status
- attempts
- last error
- created_at
- started_at
- completed_at
- idempotency key

The user interface should display:
- Processing
- Complete
- Failed
- Retry available
- Manual review required

Do not make candidate applications wait synchronously for AI processing.

---

# PART S — ANALYTICS

## 31. Employer Analytics

MVP:
- Applications per role
- Screening distribution
- Stage funnel
- Assessment completion
- Video completion
- Qualified candidates per role
- Average time in stage

Later:
- Source tracking
- Time to qualification
- Drop-off analysis
- Recruiter productivity
- Diversity analytics only where lawful and responsibly designed

### Platform Analytics

- MRR
- Active companies
- Churn
- Failed payments
- Applications processed
- AI cost by company
- Video storage by company
- Email volume
- Gross margin per plan

---

# PART T — BUILD PHASES

## 32. Phase 1 — Foundation

- New repository
- Design system
- Public landing pages
- Supabase project
- Database migrations
- Auth
- Companies
- Membership
- RLS
- Platform admin foundation
- Typed environment validation

## 33. Phase 2 — Career Pages and Jobs

- Company onboarding
- Logo upload
- Career-page editor
- Public career page
- Job CRUD
- Job publishing
- Public application
- CV upload
- Confirmation email

## 34. Phase 3 — Applicant Workspace

- Applicant database
- Candidate detail
- Secure CV viewer
- Search/filter
- Pipeline
- Notes
- Timeline

## 35. Phase 4 — AI CV Screening

- CV text extraction
- Structured semantic screening
- Human review
- Score explanations
- Failure/manual-review path
- Usage metering

## 36. Phase 5 — Assessments

- Assessment builder
- Secure candidate assessment
- Scoring
- Resend invitations/reminders
- Employer result review

## 37. Phase 6 — Video Interviews

- Question builder
- Token flow
- Camera/mic test
- Multi-question recording
- Signed upload
- Video playback
- Transcription
- AI analysis
- Usage metering

## 38. Phase 7 — Qualified Candidates and Rejections

- Qualified page
- Candidate comparison
- Rejection modal
- AI feedback draft
- Employer approval
- Rejection email log

## 39. Phase 8 — Paystack Billing

- Plans
- Checkout
- Verification
- Webhooks
- Status synchronization
- Usage periods
- Limits
- Upgrades
- Downgrades
- Cancellation
- Grace period
- Management link
- Billing UI

## 40. Phase 9 — Hardening and Launch

- Full RLS test suite
- Cross-tenant tests
- Payment webhook tests
- Email scheduling/cancel tests
- AI failure tests
- File-upload tests
- Mobile QA
- Accessibility
- Error monitoring
- Performance
- Legal pages
- Production deployment

---

# PART U — MVP ACCEPTANCE CRITERIA

## 41. End-to-End Acceptance Test

The MVP is complete when the following works without manual database intervention:

1. A company owner signs up.
2. The owner selects a Paystack subscription.
3. Payment is verified and the workspace activates.
4. The owner uploads a logo and edits the career page.
5. The owner creates and publishes a job.
6. The job appears publicly.
7. A candidate applies and uploads a CV.
8. The candidate receives an acknowledgement email.
9. The CV is extracted and screened.
10. The employer sees the screening report.
11. The employer shortlists the candidate.
12. The candidate receives an assessment.
13. The candidate completes it.
14. The employer reviews the result.
15. The employer sends a multi-question video interview.
16. The candidate records and uploads responses.
17. The system transcribes and analyses them.
18. The employer watches the videos and reads transcripts.
19. The employer marks the candidate qualified or rejects them.
20. On rejection, the system drafts a job-related explanation.
21. The employer approves and sends it.
22. All events appear in the timeline and email log.
23. Usage counters update correctly.
24. Plan limits block only the relevant new actions.
25. Company data remains isolated from every other tenant.
26. The platform admin can review company, subscription, payment, and usage status.

---

# PART V — OUT OF SCOPE FOR INITIAL RELEASE

- Payroll
- Attendance
- Leave management
- Employee onboarding
- Offer-letter generation
- Contract generation
- Background checks
- Live human interview scheduling
- Live AI interviewer
- Job-board integrations
- SSO
- Custom domains
- Agency multi-client workspaces
- Native mobile apps
- Automatic final hiring decisions
- Automatic rejection without human approval

---

# PART W — DEFINITION OF DONE

A feature is done only when it includes:

- Database migration
- RLS policy
- Server validation
- Permission checks
- Loading state
- Empty state
- Error state
- Success feedback
- Responsive UI
- Audit event where relevant
- Usage metering where relevant
- Tests for critical logic
- No secret exposure
- No cross-tenant data leakage
- Documentation of required environment variables

RecruitCandidates must launch as a complete, premium recruitment SaaS, not a collection of disconnected screens.
