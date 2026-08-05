"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { emailTemplateSchema, type EmailTemplateInput } from "@/lib/validation/email-template";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { EmailTemplate } from "@/types/database";

export function EmailTemplateEditor({ template }: { template: EmailTemplate }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<EmailTemplateInput>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      subject: template.subject,
      body: template.body,
      signature: template.signature,
      replyTo: template.reply_to ?? "",
      senderDisplayName: template.sender_display_name ?? "",
      enabled: template.enabled,
    },
  });

  async function onSubmit(values: EmailTemplateInput) {
    const res = await fetch(`/api/emails/templates/${template.type}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) {
      toast.success("Template updated");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Couldn't save template");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><Pencil className="size-4" /> Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.type.replace(/_/g, " ")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Enabled</span>
            <Switch checked={watch("enabled")} onCheckedChange={(v) => setValue("enabled", v)} />
          </div>
          <Field label="Subject" htmlFor="subject" required error={errors.subject?.message}>
            <Input id="subject" {...register("subject")} />
          </Field>
          <Field label="Body" htmlFor="body" required error={errors.body?.message} hint="Use {{first_name}}, {{role}}, {{company}}, {{link}}">
            <Textarea id="body" rows={6} {...register("body")} />
          </Field>
          <Field label="Signature" htmlFor="signature"><Input id="signature" {...register("signature")} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Reply-to" htmlFor="replyTo" error={errors.replyTo?.message}><Input id="replyTo" {...register("replyTo")} /></Field>
            <Field label="Sender name" htmlFor="senderDisplayName"><Input id="senderDisplayName" {...register("senderDisplayName")} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
