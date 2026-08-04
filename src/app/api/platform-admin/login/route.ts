import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPlatformAdminCredentials, setPlatformAdminSession } from "@/lib/auth/platform-admin";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });

  if (!verifyPlatformAdminCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  await setPlatformAdminSession(parsed.data.email);
  return NextResponse.json({ ok: true });
}
