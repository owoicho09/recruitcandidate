import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = { title: "Acceptable Use Policy" };

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" updated="August 4, 2026">
      <p>This policy describes prohibited uses of RecruitCandidates. Violations may result in suspension or termination.</p>

      <h2>Prohibited conduct</h2>
      <ul>
        <li>Attempting to access, scrape, or infer another company&apos;s candidate data, jobs, or account information.</li>
        <li>Guessing, brute-forcing, or otherwise circumventing candidate assessment or video interview access tokens.</li>
        <li>Uploading unlawful, discriminatory, or fraudulent job postings or assessment content.</li>
        <li>Using AI screening or interview analysis output as the sole, unreviewed basis for a hiring decision.</li>
        <li>Scoring or filtering candidates based on protected characteristics — name, age, gender, ethnicity, religion, photo, marital status, disability, accent, or appearance.</li>
        <li>Sending unsolicited or misleading communications to candidates outside the platform&apos;s intended flows.</li>
        <li>Attempting to disable, bypass, or interfere with rate limiting, webhook validation, or other security controls.</li>
        <li>Reverse engineering the platform or reselling access without a written agreement.</li>
      </ul>

      <h2>Responsible AI use</h2>
      <p>
        RecruitCandidates&apos; AI screening and interview analysis are decision-support tools. Screening
        scores assist review — they do not make final decisions. Customers must have a human review and
        confirm every rejection and qualification decision, and must not represent AI screening as an
        automated hiring decision to candidates.
      </p>

      <h2>Reporting abuse</h2>
      <p>Report suspected violations to trust@recruitcandidates.com.</p>
    </LegalLayout>
  );
}
