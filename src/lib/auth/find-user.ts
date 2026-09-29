import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase's admin listUsers() is paginated (50 per page by default), so
 * searching only its first page silently misses every account created after
 * the 50th. Walk the pages until the email is found.
 */
export async function findAuthUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}
