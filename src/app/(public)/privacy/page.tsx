import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 4, 2026">
      <p>
        This Privacy Policy explains how RecruitCandidates (&ldquo;we,&rdquo; &ldquo;us&rdquo;) collects, uses,
        and protects personal data belonging to hiring companies (&ldquo;Customers&rdquo;) and the candidates
        who apply through a Customer&apos;s career page.
      </p>

      <h2>Two roles: controller and processor</h2>
      <p>
        For account and billing information about a Customer and its team, RecruitCandidates acts as a{" "}
        <strong>data controller</strong>. For candidate data submitted through a Customer&apos;s career page —
        applications, CVs, assessment answers, video recordings, and transcripts — the Customer is the{" "}
        <strong>data controller</strong> and RecruitCandidates acts as a <strong>data processor</strong>,
        processing that data only on the Customer&apos;s instructions and for the purposes described in our{" "}
        Data Processing Addendum.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, work email, password hash, company details, billing information.</li>
        <li><strong>Candidate data:</strong> name, contact details, CV files and extracted text, cover notes, application answers.</li>
        <li><strong>Assessment data:</strong> assessment answers, scores, timing information.</li>
        <li><strong>Video interview data:</strong> recorded video responses, generated transcripts, AI-generated analysis and scores.</li>
        <li><strong>AI-generated assessments:</strong> screening scores, explanations, and recommendations produced by our AI models from the data above.</li>
        <li><strong>Usage data:</strong> log data, device information, and product usage analytics.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To operate the career page, application, screening, assessment, and video interview features a Customer configures.</li>
        <li>To generate AI screening reports, transcripts, and interview analysis on the Customer&apos;s behalf.</li>
        <li>To send transactional emails (application receipts, invitations, reminders, status updates).</li>
        <li>To secure the platform, prevent abuse, and meet legal obligations.</li>
        <li>To bill Customers for their subscription via Paystack.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        Candidate data is retained according to the Customer&apos;s plan-level retention setting (for example,
        3 or 12 months of video retention) or until the Customer deletes it, whichever is sooner. Account data
        is retained for the life of the Customer&apos;s account plus a limited period required for legal and
        accounting purposes.
      </p>

      <h2>Deletion</h2>
      <p>
        Customers can delete individual candidate records, and can request full account and data deletion.
        Once a deletion request is confirmed, associated CVs, videos, transcripts, and AI-generated results are
        permanently removed from active storage within a reasonable operational window, subject to any
        legal retention obligations.
      </p>

      <h2>Sub-processors</h2>
      <p>
        We use a limited set of sub-processors to operate the platform, including our database and storage
        provider, our transactional email provider, our AI model provider (for screening, transcription, and
        interview analysis), and our payment processor. A current list is available on request.
      </p>

      <h2>Your rights</h2>
      <p>
        Candidates who wish to exercise data subject rights (access, correction, deletion) should contact the
        hiring company they applied to, as the data controller for their application. Company account holders
        can contact us directly at the address below.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy can be sent to privacy@recruitcandidates.com.</p>
    </LegalLayout>
  );
}
