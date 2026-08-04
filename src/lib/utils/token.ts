import { createHmac, randomBytes } from "crypto";
import { env } from "@/lib/env";

/**
 * Candidate-facing links (assessment/video-interview/tracking) use a raw
 * token in the URL and store only its HMAC hash server-side, so a leaked
 * database row never exposes usable links.
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHmac("sha256", env.TOKEN_HASH_SECRET).update(token).digest("hex");
}

export function verifyToken(token: string, hash: string): boolean {
  return hashToken(token) === hash;
}
