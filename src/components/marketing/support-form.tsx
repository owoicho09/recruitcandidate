"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "bug", label: "Bug report" },
  { value: "billing", label: "Billing question" },
  { value: "feature_request", label: "Feature request" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  category: z.enum(["bug", "billing", "feature_request", "complaint", "other"]),
  message: z.string().min(10, "Tell us a bit more (at least 10 characters)"),
});

type FormValues = z.infer<typeof schema>;

export function SupportForm({ defaultEmail }: { defaultEmail?: string }) {
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: defaultEmail, category: "other" } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-base font-semibold text-foreground">Message sent</p>
        <p className="text-sm text-foreground-muted">We&apos;ll get back to you within one business day — check your email for a copy of your message.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" required error={errors.name?.message}>
              <Input id="name" {...register("name")} />
            </Field>
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </Field>
          </div>
          <Field label="What's this about?" htmlFor="category" required error={errors.category?.message}>
            <Select onValueChange={(v) => setValue("category", v as FormValues["category"], { shouldValidate: true })} value={watch("category")}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Message" htmlFor="message" required error={errors.message?.message}>
            <Textarea id="message" rows={5} placeholder="Tell us what's going on — the more detail, the faster we can help." {...register("message")} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="mt-2">Send message</Button>
        </form>
      </CardContent>
    </Card>
  );
}
