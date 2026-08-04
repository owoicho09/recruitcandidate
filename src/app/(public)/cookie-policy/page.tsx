import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="August 4, 2026">
      <p>RecruitCandidates uses a small number of cookies to operate the product. We do not use third-party advertising cookies.</p>

      <h2>Essential cookies</h2>
      <ul>
        <li><strong>Session cookie</strong> — keeps you signed in to your employer workspace.</li>
        <li><strong>Platform admin session cookie</strong> — keeps platform administrators signed in to the admin console, kept separate from company sessions.</li>
      </ul>
      <p>These cookies are required for the product to function and cannot be disabled while remaining signed in.</p>

      <h2>Candidate-facing pages</h2>
      <p>
        Public career pages, application forms, assessment pages, and video interview pages do not set
        tracking cookies. Access to assessments and video interviews is controlled by a secure link token,
        not a cookie.
      </p>

      <h2>Analytics</h2>
      <p>
        We may use privacy-conscious, aggregated analytics to understand product usage. Where any analytics
        cookie is used, it does not identify individual candidates.
      </p>

      <h2>Managing cookies</h2>
      <p>You can control or delete cookies through your browser settings. Disabling essential cookies will prevent you from staying signed in.</p>
    </LegalLayout>
  );
}
