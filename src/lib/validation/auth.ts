import { z } from "zod";

export const signupAccountSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  workEmail: z.string().email("Enter a valid work email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  size: z.string().min(1, "Company size is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  contactEmail: z.string().email("Enter a valid contact email"),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  brandColor: z.string().min(1),
  timezone: z.string().min(1),
});

export const signupPlanSchema = z.object({
  planId: z.string().min(1, "Select a plan"),
  interval: z.enum(["monthly", "annual"]),
});

export const signupSchema = signupAccountSchema.extend(signupCompanySchema.shape).extend(signupPlanSchema.shape);
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
