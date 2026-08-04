import { z } from "zod";

export const emailTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  signature: z.string().optional(),
  replyTo: z.string().email("Enter a valid email").optional().or(z.literal("")),
  senderDisplayName: z.string().optional(),
  enabled: z.boolean(),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
