import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  const session = await getSession();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
      <MailCheck className="size-8 text-success" />
      <h1 className="text-xl font-semibold text-foreground">
        {session ? "Your email is verified" : "Check your inbox"}
      </h1>
      <p className="text-sm text-foreground-muted">
        {session
          ? `${session.email} is confirmed. You're all set to continue.`
          : "We've sent a verification link to your email. Click it to activate your account, then log in."}
      </p>
      <Button href={session ? "/dashboard" : "/login"} className="mt-2">
        {session ? "Go to dashboard" : "Back to log in"}
      </Button>
    </div>
  );
}
