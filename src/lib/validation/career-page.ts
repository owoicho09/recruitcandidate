import { z } from "zod";

export const careerPageSchema = z.object({
  description: z.string().max(2000).optional(),
  brandColor: z.string().min(1),
  headerStyle: z.enum(["gradient", "solid", "image"]),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  facebook: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  recruitmentMessage: z.string().max(500).optional(),
  showCompanyDetails: z.boolean(),
  logoUrl: z.string().optional().nullable(),
});

export type CareerPageInput = z.infer<typeof careerPageSchema>;
