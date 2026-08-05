import { flags } from "@/lib/env";
import type { Company } from "@/types/database";

/** Best-effort — a logging failure should never break the chat response itself. */
export async function logMelvinaExchange(companyId: string, userId: string, userMessage: string, assistantReply: string) {
  if (!flags.hasSupabase) return;
  try {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("melvina_messages").insert([
      { company_id: companyId, user_id: userId, role: "user", content: userMessage },
      { company_id: companyId, user_id: userId, role: "assistant", content: assistantReply },
    ]);
  } catch (err) {
    console.error("Melvina conversation logging failed:", err instanceof Error ? err.message : err);
  }
}

export interface MelvinaMessageRow {
  id: string;
  company_id: string | null;
  user_id: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function listMelvinaMessagesForAdmin(limit = 200) {
  if (!flags.hasSupabase) return [];
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();

  const { data: messages } = await admin
    .from("melvina_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!messages || messages.length === 0) return [];

  const companyIds = [...new Set(messages.map((m) => m.company_id).filter((id): id is string => Boolean(id)))];
  const { data: companies } = await admin.from("companies").select("id, name").in("id", companyIds);

  return (messages as MelvinaMessageRow[]).map((message) => ({
    message,
    company: (companies as Pick<Company, "id" | "name">[] | null)?.find((c) => c.id === message.company_id) ?? null,
  }));
}
