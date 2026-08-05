"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { applicationSchema, type ApplicationInput } from "@/lib/validation/application";
import { Field, Input, Textarea, FieldLabel } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApplicationQuestion, Company, Job } from "@/types/database";

export function ApplicationForm({ company, job }: { company: Company; job: Job }) {
  const [cvFile, setCvFile] = React.useState<File | null>(null);
  const [cvError, setCvError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({ resolver: zodResolver(applicationSchema), defaultValues: { answers: {} } });

  async function onSubmit(values: ApplicationInput) {
    setServerError(null);
    setCvError(null);
    if (!cvFile) {
      setCvError("Upload your CV to continue");
      return;
    }

    const form = new FormData();
    form.append("companySlug", company.slug);
    form.append("jobId", job.id);
    form.append("firstName", values.firstName);
    form.append("lastName", values.lastName);
    form.append("email", values.email);
    form.append("phone", values.phone);
    form.append("location", values.location);
    form.append("linkedinUrl", values.linkedinUrl ?? "");
    form.append("portfolioUrl", values.portfolioUrl ?? "");
    form.append("coverNote", values.coverNote ?? "");
    form.append("consent", String(values.consent));
    form.append("privacyAcknowledged", String(values.privacyAcknowledged));
    form.append("answers", JSON.stringify(values.answers ?? {}));
    form.append("cv", cvFile);

    const res = await fetch("/api/applications", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSubmitted(data.trackingToken);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h1 className="text-xl font-semibold text-foreground">Application submitted</h1>
        <p className="text-sm text-foreground-muted">
          Thanks for applying to {job.title} at {company.name}. We&apos;ve sent a confirmation to your email.
        </p>
        <Button href={`/application/track/${submitted}`} variant="secondary" className="mt-2">Track your application</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{company.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Apply for {job.title}</h1>
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
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </Field>
            <Field label="Phone" htmlFor="phone" required error={errors.phone?.message}>
              <Input id="phone" {...register("phone")} />
            </Field>
            <Field label="Location" htmlFor="location" required error={errors.location?.message}>
              <Input id="location" {...register("location")} />
            </Field>
            <Field label="LinkedIn URL" htmlFor="linkedinUrl" error={errors.linkedinUrl?.message} hint="Optional">
              <Input id="linkedinUrl" placeholder="https://linkedin.com/in/..." {...register("linkedinUrl")} />
            </Field>
            <Field label="Portfolio URL" htmlFor="portfolioUrl" error={errors.portfolioUrl?.message} hint="Optional">
              <Input id="portfolioUrl" placeholder="https://" {...register("portfolioUrl")} />
            </Field>

            <div>
              <FieldLabel>CV <span className="text-danger">*</span></FieldLabel>
              <div className="mt-1.5">
                <FileUpload accept=".pdf,.doc,.docx" maxSizeMb={10} hint="PDF or Word, up to 10MB" file={cvFile} onChange={setCvFile} error={cvError ?? undefined} />
              </div>
            </div>

            <Field label="Cover note" htmlFor="coverNote" error={errors.coverNote?.message} hint="Optional">
              <Textarea id="coverNote" rows={3} {...register("coverNote")} />
            </Field>

            {job.application_questions.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-border pt-4">
                {job.application_questions.map((q: ApplicationQuestion) => (
                  <Field key={q.id} label={q.label} htmlFor={`answers.${q.id}`} required={q.required}>
                    <Controller
                      name={`answers.${q.id}`}
                      control={control}
                      rules={{ required: q.required }}
                      render={({ field }) =>
                        q.type === "textarea" ? (
                          <Textarea id={`answers.${q.id}`} rows={3} {...field} />
                        ) : (
                          <Input id={`answers.${q.id}`} {...field} />
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <label className="flex items-start gap-2.5 text-sm text-foreground-muted">
                <Controller name="consent" control={control} render={({ field }) => (
                  <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                )} />
                I consent to {company.name} processing my application data for recruitment purposes.
              </label>
              {errors.consent && <p className="text-xs text-danger">{errors.consent.message}</p>}
              <label className="flex items-start gap-2.5 text-sm text-foreground-muted">
                <Controller name="privacyAcknowledged" control={control} render={({ field }) => (
                  <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                )} />
                I&apos;ve read and acknowledge the <a href="/privacy" target="_blank" className="text-accent hover:underline">privacy policy</a>.
              </label>
              {errors.privacyAcknowledged && <p className="text-xs text-danger">{errors.privacyAcknowledged.message}</p>}
            </div>

            <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">Submit application</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
