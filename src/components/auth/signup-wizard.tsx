"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { trackXSignupConversion } from "@/lib/analytics/x-pixel";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SignupWizard() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    trackXSignupConversion();
    router.push("/dashboard?onboarding=1");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Create your workspace</h1>
        <p className="mt-1 text-sm text-foreground-muted">You can fill in the rest of your company details later, from the dashboard.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {serverError && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
                <Input id="firstName" {...register("firstName")} />
              </Field>
              <Field label="Last name" htmlFor="lastName" required error={errors.lastName?.message}>
                <Input id="lastName" {...register("lastName")} />
              </Field>
            </div>
            <Field label="Work email" htmlFor="workEmail" required error={errors.workEmail?.message}>
              <Input id="workEmail" type="email" {...register("workEmail")} />
            </Field>
            <Field label="Company name" htmlFor="companyName" required error={errors.companyName?.message}>
              <Input id="companyName" {...register("companyName")} />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters">
              <PasswordInput id="password" {...register("password")} />
            </Field>

            <p className="text-xs text-foreground-muted">
              You&apos;ll land straight in your dashboard — pick a plan whenever you&apos;re ready to publish jobs.
            </p>

            <Button type="submit" loading={isSubmitting} className="mt-2">Create workspace</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
