"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray, useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { assessmentSchema, type AssessmentFormInput } from "@/lib/validation/assessment";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { id as newId } from "@/lib/data/ids";
import type { Assessment } from "@/types/database";

const EMPTY: AssessmentFormInput = {
  title: "", instructions: "", duration_minutes: 30, pass_mark: 70, randomize_order: false, deadline_days: 5, status: "draft",
  questions: [],
};

export function AssessmentBuilder({ jobId, assessment }: { jobId: string; assessment: Assessment | null }) {
  const router = useRouter();
  const toast = useToast();

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AssessmentFormInput>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: assessment ?? EMPTY,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  async function onSubmit(values: AssessmentFormInput) {
    const res = await fetch(`/api/jobs/${jobId}/assessment`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) {
      toast.success("Assessment saved");
      router.refresh();
    } else {
      toast.error("Couldn't save assessment");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field label="Title" htmlFor="title" required error={errors.title?.message}><Input id="title" {...register("title")} /></Field>
          <Field label="Instructions" htmlFor="instructions" required error={errors.instructions?.message}><Textarea id="instructions" rows={2} {...register("instructions")} /></Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Duration (min)" htmlFor="duration_minutes"><Input id="duration_minutes" type="number" {...register("duration_minutes")} /></Field>
            <Field label="Pass mark (%)" htmlFor="pass_mark"><Input id="pass_mark" type="number" {...register("pass_mark")} /></Field>
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
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">Randomize question order</span>
            <Controller name="randomize_order" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Questions</p>
        <Button
          type="button" size="sm" variant="secondary"
          onClick={() => append({ id: newId(), type: "multiple_choice", prompt: "", options: [{ id: newId(), label: "" }, { id: newId(), label: "" }], correct_answer: [], points: 10, section: "General", order_index: fields.length })}
        >
          <Plus className="size-4" /> Add question
        </Button>
      </div>
      {errors.questions?.message && <p className="text-xs text-danger">{errors.questions.message}</p>}

      {fields.map((f, i) => (
        <QuestionEditor key={f.id} control={control} register={register} index={i} onRemove={() => remove(i)} />
      ))}

      <Button type="submit" loading={isSubmitting} className="self-start">Save assessment</Button>
    </form>
  );
}

function QuestionEditor({
  control,
  register,
  index,
  onRemove,
}: {
  control: Control<AssessmentFormInput>;
  register: UseFormRegister<AssessmentFormInput>;
  index: number;
  onRemove: () => void;
}) {
  const type = useWatch({ control, name: `questions.${index}.type` });
  const optionValues = useWatch({ control, name: `questions.${index}.options` });
  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({ control, name: `questions.${index}.options` });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <GripVertical className="mt-2.5 size-4 shrink-0 text-foreground-muted" />
          <div className="flex-1">
            <Textarea rows={2} placeholder="Question prompt" {...register(`questions.${index}.prompt`)} />
          </div>
          <button type="button" onClick={onRemove} className="rounded-md p-2 text-foreground-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="ml-7 grid grid-cols-3 gap-3">
          <Controller name={`questions.${index}.type`} control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                <SelectItem value="written">Written</SelectItem>
              </SelectContent>
            </Select>
          )} />
          <Input placeholder="Section" {...register(`questions.${index}.section`)} />
          <Input type="number" placeholder="Points" {...register(`questions.${index}.points`)} />
        </div>

        {type === "multiple_choice" && (
          <div className="ml-7 flex flex-col gap-2">
            {options.map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Controller name={`questions.${index}.correct_answer`} control={control} render={({ field }) => {
                  const optionId = optionValues?.[oi]?.id ?? opt.id;
                  const checked = Array.isArray(field.value) && field.value.includes(optionId);
                  return (
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      const current: string[] = Array.isArray(field.value) ? field.value : [];
                      field.onChange(e.target.checked ? [...current, optionId] : current.filter((v) => v !== optionId));
                    }} className="accent-[var(--color-accent)]" />
                  );
                }} />
                <Input placeholder={`Option ${oi + 1}`} {...register(`questions.${index}.options.${oi}.label`)} />
                <button type="button" onClick={() => removeOption(oi)} className="rounded-md p-1.5 text-foreground-muted hover:text-danger">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => appendOption({ id: newId(), label: "" })}>
              <Plus className="size-3.5" /> Add option
            </Button>
            <p className="text-xs text-foreground-muted">Check the correct option(s).</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
