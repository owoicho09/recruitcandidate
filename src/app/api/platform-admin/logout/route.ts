import { NextResponse } from "next/server";
import { clearPlatformAdminSession } from "@/lib/auth/platform-admin";

export async function POST(request: Request) {
  await clearPlatformAdminSession();
  return NextResponse.redirect(new URL("/platform-admin/login", request.url));
}
