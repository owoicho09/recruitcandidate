"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  workEmail: z.string().email("Enter a valid work email"),
  company: z.string().min(1, "Company is required"),
  teamSize: z.string().min(1, "Select a team size"),
  hiringVolume: z.string().min(1, "Select a hiring volume"),
  message: z.string().min(10, "Tell us a bit more (at least 10 characters)"),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-base font-semibold text-foreground">Message sent</p>
        <p className="text-sm text-foreground-muted">We&apos;ll get back to you within one business day.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Field label="Work email" htmlFor="workEmail" required error={errors.workEmail?.message}>
            <Input id="workEmail" type="email" {...register("workEmail")} />
          </Field>
          <Field label="Company" htmlFor="company" required error={errors.company?.message}>
            <Input id="company" {...register("company")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Team size" htmlFor="teamSize" required error={errors.teamSize?.message}>
              <Select onValueChange={(v) => setValue("teamSize", v, { shouldValidate: true })} value={watch("teamSize")}>
                <SelectTrigger id="teamSize"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hiring volume" htmlFor="hiringVolume" required error={errors.hiringVolume?.message}>
              <Select onValueChange={(v) => setValue("hiringVolume", v, { shouldValidate: true })} value={watch("hiringVolume")}>
                <SelectTrigger id="hiringVolume"><SelectValue placeholder="Roles / month" /></SelectTrigger>
                <SelectContent>
                  {["1-5", "6-20", "21-50", "50+"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Message" htmlFor="message" required error={errors.message?.message}>
            <Textarea id="message" rows={4} {...register("message")} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="mt-2">Send message</Button>
        </form>
      </CardContent>
    </Card>
  );
}
