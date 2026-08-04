"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Company } from "@/types/database";

interface FormValues { name: string; industry: string; size: string; timezone: string }

export function SettingsForm({ company, readOnly }: { company: Company; readOnly: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: company.name, industry: company.industry ?? "", size: company.size ?? "", timezone: company.timezone },
  });

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/companies/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Settings saved"); router.refresh(); }
    else toast.error("Couldn't save settings");
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Company name" htmlFor="name"><Input id="name" disabled={readOnly} {...register("name")} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Industry" htmlFor="industry"><Input id="industry" disabled={readOnly} {...register("industry")} /></Field>
            <Field label="Company size" htmlFor="size"><Input id="size" disabled={readOnly} {...register("size")} /></Field>
          </div>
          <Field label="Timezone" htmlFor="timezone"><Input id="timezone" disabled={readOnly} {...register("timezone")} /></Field>
          {!readOnly && <Button type="submit" loading={isSubmitting} className="self-start">Save changes</Button>}
          {readOnly && <p className="text-xs text-foreground-muted">Only the workspace owner can change these settings.</p>}
        </form>
      </CardContent>
    </Card>
  );
}
