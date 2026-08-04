"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormValues { email: string; password: string }

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await fetch("/api/platform-admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) {
      router.push("/platform-admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-foreground px-4 py-16">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-background/10"><Shield className="size-5 text-background" /></div>
          <h1 className="text-xl font-semibold text-background">Platform Admin</h1>
          <p className="text-sm text-background/60">Separate from company accounts — never use this for regular sign-in.</p>
        </div>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
              <Field label="Email" htmlFor="email" required><Input id="email" type="email" {...register("email", { required: true })} /></Field>
              <Field label="Password" htmlFor="password" required><Input id="password" type="password" {...register("password", { required: true })} /></Field>
              <Button type="submit" loading={isSubmitting}>Log in</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
