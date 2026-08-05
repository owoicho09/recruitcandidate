import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Uploads to a private bucket. Path must be prefixed with the owning company's UUID — the storage RLS policies (see 012_storage_buckets.sql) key access off that first path segment. */
export async function uploadPrivateFile(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(bucket).upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
}

/** Time-limited signed URL for a private object — callers must independently verify the requester belongs to the owning company before calling this, since the admin client bypasses storage RLS. */
export async function getSignedFileUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error("Could not create signed URL");
  return data.signedUrl;
}
