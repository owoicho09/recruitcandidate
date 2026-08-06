"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { jobSchema, type JobFormInput } from "@/lib/validation/job";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TagListInput } from "@/components/dashboard/tag-list-input";
import { ScreeningWeightsBuilder } from "@/components/dashboard/screening-weights-builder";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils/slug";
import { id as newId } from "@/lib/data/ids";
import type { Job } from "@/types/database";

const DEFAULT_WEIGHTS = { required_skills: 30, relevant_experience: 25, transferable_experience: 15, education: 10, certifications: 5, achievements: 10, application_answers: 5 };

const TAB_FOR_FIELD: Record<string, "details" | "requirements" | "screening"> = {
  title: "details", slug: "details", department: "details", location: "details",
  work_arrangement: "details", employment_type: "details", salary_min: "details", salary_max: "details",
  currency: "details", summary: "details", description: "details", openings_count: "details", closing_date: "details",
  responsibilities: "requirements", required_skills: "requirements", preferred_skills: "requirements",
  min_experience: "requirements", education_requirements: "requirements", other_requirements: "requirements",
  application_questions: "requirements", screening_weights: "screening",
};

function toFormValues(job?: Job): JobFormInput {
  if (!job) {
    return {
      title: "", slug: "", department: "", location: "", work_arrangement: "onsite", employment_type: "full_time",
      salary_min: null, salary_max: null, currency: "NGN", summary: "", description: "",
      responsibilities: [], required_skills: [], preferred_skills: [], min_experience: null,
      education_requirements: "", other_requirements: [], application_questions: [],
      screening_weights: DEFAULT_WEIGHTS, openings_count: 1, closing_date: null,
    };
  }
  return {
    title: job.title, slug: job.slug, department: job.department, location: job.location,
    work_arrangement: job.work_arrangement, employment_type: job.employment_type,
    salary_min: job.salary_min, salary_max: job.salary_max, currency: job.currency,
    summary: job.summary, description: job.description, responsibilities: job.responsibilities,
    required_skills: job.required_skills, preferred_skills: job.preferred_skills,
    min_experience: job.min_experience, education_requirements: job.education_requirements ?? "",
    other_requirements: job.other_requirements, application_questions: job.application_questions,
    screening_weights: job.screening_weights, openings_count: job.openings_count,
    closing_date: job.closing_date ? job.closing_date.slice(0, 10) : null,
  };
}

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const toast = useToast();
  const [slugTouched, setSlugTouched] = React.useState(Boolean(job));
  const [activeTab, setActiveTab] = React.useState<"details" | "requirements" | "screening">("details");

  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobFormInput>({ resolver: zodResolver(jobSchema), defaultValues: toFormValues(job) });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({ control, name: "application_questions" });

  const title = watch("title");
  const weights = watch("screening_weights");

  React.useEffect(() => {
    if (!slugTouched && title) setValue("slug", slugify(title));
  }, [title, slugTouched, setValue]);

  async function onSubmit(values: JobFormInput) {
    const res = await fetch(job ? `/api/jobs/${job.id}` : "/api/jobs", {
      method: job ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Couldn't save job", data.error);
      return;
    }
    if (job) {
      toast.success("Job updated");
    } else {
      toast.success("Job created as a draft", "It won't appear on your career page until you publish it — open the job and click Publish when you're ready.");
    }
    router.push(`/dashboard/jobs/${data.job.id}`);
    router.refresh();
  }

  function onError(formErrors: typeof errors) {
    const firstErrorField = Object.keys(formErrors)[0];
    const tab = firstErrorField ? TAB_FOR_FIELD[firstErrorField] : undefined;
    if (tab && tab !== activeTab) setActiveTab(tab);
    toast.error("Check the highlighted fields", "Some required fields are missing or invalid.");
  }

  const tabHasError = (tab: "details" | "requirements" | "screening") =>
    Object.keys(errors).some((field) => TAB_FOR_FIELD[field] === tab);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col gap-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="details">Job Details{tabHasError("details") && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-danger" />}</TabsTrigger>
          <TabsTrigger value="requirements">Requirements & Questions{tabHasError("requirements") && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-danger" />}</TabsTrigger>
          <TabsTrigger value="screening">Screening Weights{tabHasError("screening") && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-danger" />}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <Field label="Job title" htmlFor="title" required error={errors.title?.message}>
                <Input id="title" {...register("title")} />
              </Field>
              <Field label="Slug" htmlFor="slug" required error={errors.slug?.message} hint={`/[company]/careers/${watch("slug") || "..."}`}>
                <Input id="slug" {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Department" htmlFor="department" required error={errors.department?.message}>
                  <Input id="department" {...register("department")} />
                </Field>
                <Field label="Location" htmlFor="location" required error={errors.location?.message}>
                  <Input id="location" {...register("location")} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Work arrangement" htmlFor="work_arrangement">
                  <Controller name="work_arrangement" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="work_arrangement"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
                <Field label="Employment type" htmlFor="employment_type">
                  <Controller name="employment_type" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="employment_type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Salary min" htmlFor="salary_min" hint="Optional">
                  <Input id="salary_min" type="number" {...register("salary_min")} />
                </Field>
                <Field label="Salary max" htmlFor="salary_max" hint="Optional">
                  <Input id="salary_max" type="number" {...register("salary_max")} />
                </Field>
                <Field label="Currency" htmlFor="currency">
                  <Input id="currency" {...register("currency")} />
                </Field>
              </div>
              <Field label="Summary" htmlFor="summary" required error={errors.summary?.message} hint="One or two sentences shown on the career page list">
                <Textarea id="summary" rows={2} {...register("summary")} />
              </Field>
              <Field label="Description" htmlFor="description" required error={errors.description?.message}>
                <Textarea id="description" rows={5} {...register("description")} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Openings" htmlFor="openings_count" required error={errors.openings_count?.message}>
                  <Input id="openings_count" type="number" min={1} {...register("openings_count")} />
                </Field>
                <Field label="Closing date" htmlFor="closing_date" hint="Optional">
                  <Input id="closing_date" type="date" {...register("closing_date")} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <Field label="Responsibilities" htmlFor="responsibilities">
                <Controller name="responsibilities" control={control} render={({ field }) => (
                  <TagListInput value={field.value} onChange={field.onChange} placeholder="Add a responsibility" />
                )} />
              </Field>
              <Field label="Required skills" htmlFor="required_skills" required error={errors.required_skills?.message}>
                <Controller name="required_skills" control={control} render={({ field }) => (
                  <TagListInput value={field.value} onChange={field.onChange} placeholder="Add a required skill" />
                )} />
              </Field>
              <Field label="Preferred skills" htmlFor="preferred_skills">
                <Controller name="preferred_skills" control={control} render={({ field }) => (
                  <TagListInput value={field.value} onChange={field.onChange} placeholder="Add a preferred skill" />
                )} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Minimum experience (years)" htmlFor="min_experience" hint="Optional">
                  <Input id="min_experience" type="number" {...register("min_experience")} />
                </Field>
                <Field label="Education requirements" htmlFor="education_requirements" hint="Optional">
                  <Input id="education_requirements" {...register("education_requirements")} />
                </Field>
              </div>
              <Field label="Other minimum requirements" htmlFor="other_requirements">
                <Controller name="other_requirements" control={control} render={({ field }) => (
                  <TagListInput value={field.value} onChange={field.onChange} placeholder="Add another requirement" />
                )} />
              </Field>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Application questions</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => appendQuestion({ id: newId(), label: "", type: "text", required: false })}>
                    <Plus className="size-4" /> Add question
                  </Button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {questionFields.map((f, i) => (
                    <div key={f.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <div className="flex-1">
                        <Input placeholder="Question text" {...register(`application_questions.${i}.label`)} />
                      </div>
                      <Controller name={`application_questions.${i}.type`} control={control} render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Long text</SelectItem>
                            <SelectItem value="boolean">Yes/No</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground-muted">
                        <Controller name={`application_questions.${i}.required`} control={control} render={({ field }) => (
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                        )} />
                        Required
                      </label>
                      <button type="button" onClick={() => removeQuestion(i)} className="rounded-md p-2 text-foreground-muted hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {questionFields.length === 0 && <p className="text-sm text-foreground-muted">No custom questions yet.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screening">
          <Card>
            <CardContent>
              <ScreeningWeightsBuilder control={control} weights={weights as Record<keyof JobFormInput["screening_weights"], number>} />
              {errors.screening_weights?.message && <p className="mt-2 text-xs text-danger">{errors.screening_weights.message as string}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={isSubmitting}>{job ? "Save changes" : "Create job"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
