"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/utils/slug";

const STEPS = ["Account", "Company"] as const;

const STEP_FIELDS: Record<number, (keyof SignupInput)[]> = {
  0: ["firstName", "lastName", "workEmail", "password"],
  1: ["companyName", "slug", "industry", "size", "country", "city", "contactEmail", "brandColor", "timezone"],
};

export function SignupWizard() {
  const router = useRouter();
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
    defaultValues: { brandColor: "#3730a3", timezone: "Africa/Lagos" },
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
    router.push("/dashboard?onboarding=1");
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <p className="text-xs text-foreground-muted">
                  You&apos;ll land straight in your dashboard — pick a plan whenever you&apos;re ready to publish jobs.
                </p>
              </>
            )}

            <div className="mt-2 flex items-center justify-between">
              {step > 0 ? (
                <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              ) : <span />}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next}>Continue</Button>
              ) : (
                <Button type="submit" loading={isSubmitting}>Create workspace</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
