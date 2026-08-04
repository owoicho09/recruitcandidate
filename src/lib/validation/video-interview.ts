import { z } from "zod";

const questionSchema = z.object({
  id: z.string(),
  video_interview_id: z.string().optional(),
  prompt: z.string().min(1, "Question text is required"),
  prep_seconds: z.coerce.number().min(0),
  response_seconds: z.coerce.number().min(10),
  retries_allowed: z.boolean(),
  max_retries: z.coerce.number().min(0),
  scoring_criteria: z.array(z.string()),
  order_index: z.number(),
});

export const videoInterviewSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().min(1, "Instructions are required"),
  deadline_days: z.coerce.number().min(1),
  status: z.enum(["draft", "active", "archived"]),
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export type VideoInterviewFormInput = z.input<typeof videoInterviewSchema>;
