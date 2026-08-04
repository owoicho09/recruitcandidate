import { NextResponse } from "next/server";
import { isSlugAvailable } from "@/lib/services/companies";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug || slug.length < 2) return NextResponse.json({ available: false });
  const available = await isSlugAvailable(slug);
  return NextResponse.json({ available });
}
