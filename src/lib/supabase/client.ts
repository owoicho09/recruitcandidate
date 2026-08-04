"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env-public";

/** Browser-side Supabase client. Only usable once real Supabase credentials are configured. */
export function createClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error("Supabase is not configured — this app is running in demo mode.");
  }
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
