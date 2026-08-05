import type { Metadata } from "next";
import { SignupWizard } from "@/components/auth/signup-wizard";

export const metadata: Metadata = { title: "Start hiring" };

export default function SignupPage() {
  return <SignupWizard />;
}
