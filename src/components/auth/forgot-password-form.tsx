"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";

type FormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: FormValues) {
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
        <MailCheck className="size-8 text-success" />
        <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
        <p className="text-sm text-foreground-muted">If an account exists for that email, we&apos;ve sent a link to reset your password.</p>
        <Link href="/login" className="text-sm text-accent hover:underline">Back to log in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-1 text-sm text-foreground-muted">Enter your email and we&apos;ll send you a reset link.</p>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </Field>
            <Button type="submit" loading={isSubmitting}>Send reset link</Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-foreground-muted">
        <Link href="/login" className="text-accent hover:underline">Back to log in</Link>
      </p>
    </div>
  );
}
