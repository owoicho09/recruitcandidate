import { z } from "zod";

export const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  location: z.string().min(1, "Location is required"),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  coverNote: z.string().optional(),
  consent: z.literal(true, { message: "You must consent to continue" }),
  privacyAcknowledged: z.literal(true, { message: "You must acknowledge the privacy notice" }),
  answers: z.record(z.string(), z.string()),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
