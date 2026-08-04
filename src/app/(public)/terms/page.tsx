import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="August 4, 2026">
      <p>
        These Terms govern access to and use of RecruitCandidates. By creating a workspace, you agree to
        these Terms on behalf of yourself and the company you represent.
      </p>

      <h2>The service</h2>
      <p>
        RecruitCandidates is a recruitment workspace: branded career pages, application intake, AI-assisted
        CV screening, assessments, asynchronous video interviews, and a qualified-candidate workspace.
        RecruitCandidates does not make hiring decisions — every screening, rejection, and qualification
        outcome is confirmed by a human on the Customer&apos;s team.
      </p>

      <h2>Accounts and subscriptions</h2>
      <ul>
        <li>You must provide accurate account and billing information.</li>
        <li>Subscriptions renew automatically each billing period via Paystack until canceled.</li>
        <li>Usage is metered per plan (active jobs, applications, AI screenings, assessment invitations, video interview candidates, team members) as described on our Pricing page.</li>
        <li>Exceeding a plan limit blocks the specific new action until you upgrade or the period resets — it never deletes existing data.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the platform, including uploading unlawful content, attempting to access
        another company&apos;s data, or using AI screening output as the sole basis for a decision protected
        by anti-discrimination law without independent human review. See our Acceptable Use Policy for details.
      </p>

      <h2>Candidate communications</h2>
      <p>
        You are responsible for the accuracy of job postings, assessment content, and any rejection messages
        you approve and send, including AI-drafted rejection explanations — RecruitCandidates provides a
        draft, but you control what is ultimately sent.
      </p>

      <h2>Data ownership</h2>
      <p>
        As between you and RecruitCandidates, you own the candidate and hiring data you collect through your
        workspace. We process it on your behalf as described in our Data Processing Addendum.
      </p>

      <h2>Termination</h2>
      <p>
        You may cancel at any time; your workspace remains accessible through the end of the current billing
        period, then becomes read-only. We may suspend accounts that violate these Terms or the Acceptable
        Use Policy.
      </p>

      <h2>Disclaimers &amp; liability</h2>
      <p>
        The service is provided &ldquo;as is.&rdquo; AI-generated scores and explanations are decision-support
        tools, not guarantees of candidate suitability. To the extent permitted by law, our liability is
        limited to the fees paid in the twelve months preceding a claim.
      </p>

      <h2>Contact</h2>
      <p>Questions about these Terms can be sent to legal@recruitcandidates.com.</p>
    </LegalLayout>
  );
}
