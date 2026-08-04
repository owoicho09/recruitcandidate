"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInviteSchema, type AcceptInviteInput } from "@/lib/validation/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";

interface InviteInfo {
  email: string;
  role: string;
  companyName: string;
}

export function AcceptInviteForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [invite, setInvite] = React.useState<InviteInfo | null | undefined>(() => (token ? undefined : null));
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteInput>({ resolver: zodResolver(acceptInviteSchema), defaultValues: { token: token ?? "" } });

  React.useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setInvite);
  }, [token]);

  async function onSubmit(values: AcceptInviteInput) {
    setServerError(null);
    const res = await fetch("/api/auth/accept-invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (invite === undefined) return <LoadingState label="Checking your invitation…" />;
  if (invite === null) {
    return <ErrorState title="Invitation not found" description="This invitation link is invalid or has expired." action={{ label: "Go to log in", href: "/login" }} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Join {invite.companyName}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          You&apos;ve been invited as <span className="font-medium text-foreground">{invite.role.replace("_", " ")}</span> — {invite.email}
        </p>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {serverError && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>}
            <input type="hidden" {...register("token")} />
            <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
              <Input id="fullName" {...register("fullName")} />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters">
              <Input id="password" type="password" {...register("password")} />
            </Field>
            <Button type="submit" loading={isSubmitting}>Accept invitation</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
