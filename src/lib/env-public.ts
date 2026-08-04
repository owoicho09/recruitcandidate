/**
 * Client-safe environment values. Only NEXT_PUBLIC_* vars belong here —
 * this module is imported from "use client" components.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "RecruitCandidates",
  demoMode: (process.env.NEXT_PUBLIC_DEMO_MODE ?? "true") !== "false",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
