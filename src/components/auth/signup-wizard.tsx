"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/utils/slug";
import { formatCurrency } from "@/lib/utils/format";
import type { Plan } from "@/types/database";

const STEPS = ["Account", "Company", "Plan"] as const;

const STEP_FIELDS: Record<number, (keyof SignupInput)[]> = {
  0: ["firstName", "lastName", "workEmail", "password"],
  1: ["companyName", "slug", "industry", "size", "country", "city", "contactEmail", "brandColor", "timezone"],
  2: ["planId", "interval"],
};

export function SignupWizard({ plans }: { plans: Plan[] }) {
  const [step, setStep] = React.useState(0);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [slugStatus, setSlugStatus] = React.useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugTouched, setSlugTouched] = React.useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { interval: "monthly", brandColor: "#3730a3", timezone: "Africa/Lagos", planId: plans.find((p) => p.slug === "growth")?.id ?? plans[0]?.id },
  });

  const companyName = watch("companyName");
  const slug = watch("slug");

  React.useEffect(() => {
    if (!slugTouched && companyName) setValue("slug", slugify(companyName));
  }, [companyName, slugTouched, setValue]);

  React.useEffect(() => {
    if (!slug || slug.length < 2) return;
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugStatus(data.available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  async function next() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    if (step === 1 && slugStatus === "taken") return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    // Full page navigation to a Paystack-hosted (or demo callback) URL, triggered by form submit.
    window.location.href = data.redirectUrl;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Create your workspace</h1>
        <p className="mt-1 text-sm text-foreground-muted">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i < step ? "bg-accent text-accent-foreground" : i === step ? "bg-accent-soft text-accent" : "bg-surface-muted text-foreground-muted")}>
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-accent" : "bg-border")} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {serverError && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>}

            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
                <Field label="Password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters">
                  <Input id="password" type="password" {...register("password")} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Company name" htmlFor="companyName" required error={errors.companyName?.message}>
                  <Input id="companyName" {...register("companyName")} />
                </Field>
                <Field
                  label="Workspace URL"
                  htmlFor="slug"
                  required
                  error={errors.slug?.message}
                  hint={
                    slug
                      ? `recruitcandidates.com/${slug}/careers${slugStatus === "taken" ? " — already taken" : slugStatus === "available" ? " — available" : ""}`
                      : undefined
                  }
                >
                  <Input id="slug" {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} aria-invalid={slugStatus === "taken"} />
                </Field>
                <Field label="Description" htmlFor="description" error={errors.description?.message}>
                  <Textarea id="description" rows={2} {...register("description")} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Industry" htmlFor="industry" required error={errors.industry?.message}>
                    <Input id="industry" {...register("industry")} />
                  </Field>
                  <Field label="Company size" htmlFor="size" required error={errors.size?.message}>
                    <Select onValueChange={(v) => setValue("size", v, { shouldValidate: true })} value={watch("size")}>
                      <SelectTrigger id="size"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Country" htmlFor="country" required error={errors.country?.message}>
                    <Input id="country" {...register("country")} />
                  </Field>
                  <Field label="City" htmlFor="city" required error={errors.city?.message}>
                    <Input id="city" {...register("city")} />
                  </Field>
                </div>
                <Field label="Contact email" htmlFor="contactEmail" required error={errors.contactEmail?.message}>
                  <Input id="contactEmail" type="email" {...register("contactEmail")} />
                </Field>
                <Field label="Website" htmlFor="website" error={errors.website?.message} hint="Optional">
                  <Input id="website" placeholder="https://" {...register("website")} />
                </Field>
                <Field label="Brand accent color" htmlFor="brandColor" error={errors.brandColor?.message}>
                  <input id="brandColor" type="color" className="h-10 w-16 rounded-lg border border-border-strong bg-surface p-1" {...register("brandColor")} />
                </Field>
              </>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                {plans.filter((p) => p.slug !== "enterprise").map((plan) => (
                  <label
                    key={plan.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors",
                      watch("planId") === plan.id ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" value={plan.id} {...register("planId")} className="accent-[var(--color-accent)]" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                        <p className="text-xs text-foreground-muted">{plan.limits.active_jobs} active jobs · {plan.limits.applications.toLocaleString()} applications/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.slug === "growth" && <StatusChip tone="accent">Recommended</StatusChip>}
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(plan.amount, plan.currency)}/mo</p>
                    </div>
                  </label>
                ))}
                <p className="text-xs text-foreground-muted">
                  You&apos;ll confirm payment with Paystack on the next step. In demo mode this activates instantly.
                </p>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              {step > 0 ? (
                <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              ) : <span />}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next}>Continue</Button>
              ) : (
                <Button type="submit" loading={isSubmitting}>Subscribe & create workspace</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
