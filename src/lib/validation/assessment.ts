import { z } from "zod";

const optionSchema = z.object({ id: z.string(), label: z.string().min(1, "Option text required") });

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "written"]),
  prompt: z.string().min(1, "Question text is required"),
  options: z.array(optionSchema),
  correct_answer: z.array(z.string()).nullable(),
  points: z.coerce.number().min(1),
  section: z.string().min(1, "Section is required"),
  order_index: z.number(),
});

export const assessmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().min(1, "Instructions are required"),
  duration_minutes: z.coerce.number().min(1),
  pass_mark: z.coerce.number().min(0).max(100),
  randomize_order: z.boolean(),
  deadline_days: z.coerce.number().min(1),
  status: z.enum(["draft", "active", "archived"]),
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export type AssessmentFormInput = z.input<typeof assessmentSchema>;
