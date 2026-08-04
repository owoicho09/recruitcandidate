import type { Metadata } from "next";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { listPlans } from "@/lib/services/billing";

export const metadata: Metadata = { title: "Start hiring" };

export default async function SignupPage() {
  const plans = await listPlans();
  return <SignupWizard plans={plans} />;
}
