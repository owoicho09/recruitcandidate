import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = { title: "Data Processing Addendum" };

export default function DataProcessingPage() {
  return (
    <LegalLayout title="Data Processing Addendum" updated="August 4, 2026">
      <p>
        This Data Processing Addendum (&ldquo;DPA&rdquo;) forms part of the agreement between a Customer and
        RecruitCandidates and describes how we process candidate personal data on the Customer&apos;s behalf.
      </p>

      <h2>Roles</h2>
      <p>
        For candidate data — applications, CVs, cover notes, application answers, assessment responses, video
        recordings, transcripts, and AI-generated screening or interview analysis — the Customer is the{" "}
        <strong>data controller</strong> and RecruitCandidates is the <strong>data processor</strong>,
        processing this data solely to provide the service and on the Customer&apos;s documented instructions.
      </p>

      <h2>Categories of data processed</h2>
      <ul>
        <li>Candidate identity and contact data (name, email, phone, location, LinkedIn/portfolio links)</li>
        <li>CV files and extracted text</li>
        <li>Application and assessment answers</li>
        <li>Video interview recordings and generated transcripts</li>
        <li>AI-generated screening scores, explanations, and interview analysis</li>
      </ul>

      <h2>Processing activities</h2>
      <ul>
        <li>Storing CVs and videos in access-controlled, tenant-isolated storage</li>
        <li>Extracting CV text and generating semantic screening results against Customer-defined job requirements</li>
        <li>Transcribing video responses and generating question-level analysis against Customer-defined scoring criteria</li>
        <li>Sending Customer-configured candidate emails (receipts, invitations, reminders, status updates)</li>
        <li>Drafting rejection explanations for Customer review and approval</li>
      </ul>

      <h2>Sub-processors</h2>
      <p>
        RecruitCandidates uses sub-processors for database/storage hosting, transactional email delivery, AI
        model inference (screening, transcription, interview analysis), and payment processing. We remain
        responsible for sub-processor compliance with this DPA.
      </p>

      <h2>Security measures</h2>
      <ul>
        <li>Row-level tenant isolation — no cross-company access to candidate data</li>
        <li>Private storage buckets with time-limited signed URLs for CVs and videos</li>
        <li>Hashed candidate access tokens for assessment and video interview links</li>
        <li>Webhook signature validation for all payment and email provider callbacks</li>
        <li>Audit logging of sensitive employer actions</li>
      </ul>

      <h2>Retention and deletion</h2>
      <p>
        Candidate data is retained per the Customer&apos;s plan-level retention setting or until the Customer
        deletes it. On account termination, Customer data is deleted or returned within a reasonable period,
        subject to legally required retention.
      </p>

      <h2>Data subject requests</h2>
      <p>
        RecruitCandidates will assist the Customer in responding to data subject access, correction, or
        deletion requests relating to candidate data, consistent with our role as processor.
      </p>
    </LegalLayout>
  );
}
