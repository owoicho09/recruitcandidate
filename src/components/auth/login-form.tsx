"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEMO_ROLES = [
  { role: "owner", label: "Owner — Amara" },
  { role: "admin", label: "Admin — David" },
  { role: "recruiter", label: "Recruiter — Priya" },
  { role: "hiring_manager", label: "Hiring Manager — James" },
  { role: "reviewer", label: "Reviewer — Grace" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Log in</h1>
        <p className="mt-1 text-sm text-foreground-muted">Welcome back to your hiring workspace.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {serverError && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>}
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
            </Field>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-accent hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" loading={isSubmitting}>Log in</Button>
          </form>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-foreground-muted">or try the demo</span></div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
            <Sparkles className="size-3.5 text-accent" /> Sign in instantly as a seeded demo account
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ROLES.map((r) => (
              <Button key={r.role} href={`/api/auth/demo-login?role=${r.role}`} variant="secondary" size="sm">
                {r.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-foreground-muted">
        Don&apos;t have a workspace? <Link href="/signup" className="text-accent hover:underline">Start hiring</Link>
      </p>
    </div>
  );
}
