"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { videoInterviewSchema, type VideoInterviewFormInput } from "@/lib/validation/video-interview";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { TagListInput } from "@/components/dashboard/tag-list-input";
import { useToast } from "@/components/ui/toast";
import { id as newId } from "@/lib/data/ids";
import type { VideoInterview } from "@/types/database";

const EMPTY: VideoInterviewFormInput = { title: "", instructions: "", deadline_days: 7, status: "draft", questions: [] };

export function VideoInterviewBuilder({ jobId, videoInterview }: { jobId: string; videoInterview: VideoInterview | null }) {
  const router = useRouter();
  const toast = useToast();

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<VideoInterviewFormInput>({
    resolver: zodResolver(videoInterviewSchema),
    defaultValues: videoInterview ?? EMPTY,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  async function onSubmit(values: VideoInterviewFormInput) {
    const res = await fetch(`/api/jobs/${jobId}/video-interview`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Video interview saved"); router.refresh(); }
    else toast.error("Couldn't save video interview");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field label="Title" htmlFor="title" required error={errors.title?.message}><Input id="title" {...register("title")} /></Field>
          <Field label="Introduction / instructions" htmlFor="instructions" required error={errors.instructions?.message}><Textarea id="instructions" rows={3} {...register("instructions")} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Deadline (days)" htmlFor="deadline_days"><Input id="deadline_days" type="number" {...register("deadline_days")} /></Field>
            <Field label="Status" htmlFor="status">
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Questions</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => append({ id: newId(), prompt: "", prep_seconds: 30, response_seconds: 90, retries_allowed: true, max_retries: 1, scoring_criteria: [], order_index: fields.length })}>
          <Plus className="size-4" /> Add question
        </Button>
      </div>
      {errors.questions?.message && <p className="text-xs text-danger">{errors.questions.message}</p>}

      {fields.map((f, i) => (
        <Card key={f.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <GripVertical className="mt-2.5 size-4 shrink-0 text-foreground-muted" />
              <div className="flex-1"><Textarea rows={2} placeholder="Question prompt" {...register(`questions.${i}.prompt`)} /></div>
              <button type="button" onClick={() => remove(i)} className="rounded-md p-2 text-foreground-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
            <div className="ml-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Prep (sec)" htmlFor={`prep-${i}`}><Input id={`prep-${i}`} type="number" {...register(`questions.${i}.prep_seconds`)} /></Field>
              <Field label="Response (sec)" htmlFor={`resp-${i}`}><Input id={`resp-${i}`} type="number" {...register(`questions.${i}.response_seconds`)} /></Field>
              <Field label="Max retries" htmlFor={`retries-${i}`}><Input id={`retries-${i}`} type="number" {...register(`questions.${i}.max_retries`)} /></Field>
              <div className="flex items-end justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-xs font-medium text-foreground">Allow retries</span>
                <Controller name={`questions.${i}.retries_allowed`} control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
              </div>
            </div>
            <div className="ml-7">
              <Field label="Scoring criteria" htmlFor={`criteria-${i}`}>
                <Controller name={`questions.${i}.scoring_criteria`} control={control} render={({ field }) => (
                  <TagListInput value={field.value} onChange={field.onChange} placeholder="Add a scoring criterion" />
                )} />
              </Field>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="submit" loading={isSubmitting} className="self-start">Save video interview</Button>
    </form>
  );
}
