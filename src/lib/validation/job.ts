import { z } from "zod";

const applicationQuestionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Question text is required"),
  type: z.enum(["text", "textarea", "select", "boolean"]),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

const screeningWeightsSchema = z.object({
  required_skills: z.coerce.number().min(0).max(100),
  relevant_experience: z.coerce.number().min(0).max(100),
  transferable_experience: z.coerce.number().min(0).max(100),
  education: z.coerce.number().min(0).max(100),
  certifications: z.coerce.number().min(0).max(100),
  achievements: z.coerce.number().min(0).max(100),
  application_answers: z.coerce.number().min(0).max(100),
});

export const jobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  work_arrangement: z.enum(["onsite", "hybrid", "remote"]),
  employment_type: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]),
  salary_min: z.coerce.number().nullable().optional(),
  salary_max: z.coerce.number().nullable().optional(),
  currency: z.string().default("NGN"),
  summary: z.string().min(1, "Summary is required"),
  description: z.string().min(1, "Description is required"),
  responsibilities: z.array(z.string()),
  required_skills: z.array(z.string()).min(1, "Add at least one required skill"),
  preferred_skills: z.array(z.string()),
  min_experience: z.coerce.number().nullable().optional(),
  education_requirements: z.string().optional().nullable(),
  other_requirements: z.array(z.string()),
  application_questions: z.array(applicationQuestionSchema),
  screening_weights: screeningWeightsSchema.refine((w) => Object.values(w).reduce((a, b) => a + b, 0) === 100, {
    message: "Screening weights must total 100%",
  }),
  openings_count: z.coerce.number().min(1),
  closing_date: z.string().nullable().optional(),
});

export type JobFormInput = z.input<typeof jobSchema>;
