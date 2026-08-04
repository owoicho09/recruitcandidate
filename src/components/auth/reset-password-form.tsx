"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token: token ?? "" } });

  if (!token) {
    return <ErrorState title="Invalid reset link" description="This password reset link is missing its token. Request a new one." action={{ label: "Request new link", href: "/forgot-password" }} />;
  }

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <h1 className="text-xl font-semibold text-foreground">Password updated</h1>
        <p className="text-sm text-foreground-muted">Redirecting you to log in…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {serverError && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>}
            <input type="hidden" {...register("token")} />
            <Field label="New password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters">
              <Input id="password" type="password" {...register("password")} />
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            </Field>
            <Button type="submit" loading={isSubmitting}>Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
