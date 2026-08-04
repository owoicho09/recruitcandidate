import type { Metadata } from "next";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function AcceptInvitePage({ searchParams }: PageProps<"/accept-invite">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  return <AcceptInviteForm token={token} />;
}
