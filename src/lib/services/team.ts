import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id, daysFromNow } from "@/lib/data/ids";
import { generateToken, hashToken } from "@/lib/utils/token";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";
import type { CompanyMember, CompanyRole, TeamInvitation } from "@/types/database";

export async function listMembers(companyId: string): Promise<CompanyMember[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("company_members").select("*").eq("company_id", companyId);
    return (data as CompanyMember[]) ?? [];
  }
  return mockStore.companyMembers.filter((m) => m.company_id === companyId);
}

export async function listInvitations(companyId: string): Promise<TeamInvitation[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("team_invitations").select("*").eq("company_id", companyId).eq("status", "pending");
    return (data as TeamInvitation[]) ?? [];
  }
  return mockStore.teamInvitations.filter((i) => i.company_id === companyId && i.status === "pending");
}

export async function inviteMember(companyId: string, invitedBy: string, email: string, role: CompanyRole): Promise<TeamInvitation> {
  const token = generateToken();

  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();

    const { data: invitation, error } = await supabase
      .from("team_invitations")
      .insert({ company_id: companyId, email, role, token_hash: hashToken(token), invited_by: invitedBy, expires_at: daysFromNow(7), status: "pending" })
      .select("*")
      .single();
    if (error) throw error;

    const { data: company } = await supabase.from("companies").select("name").eq("id", companyId).single();
    const { data: inviter } = await supabase.from("company_members").select("full_name").eq("company_id", companyId).eq("user_id", invitedBy).maybeSingle();
    const template = await getTemplate(companyId, "team_invitation");
    const subject = template ? renderTemplate(template.subject, { company: company!.name }) : `You've been invited to join ${company!.name}`;
    const body = template
      ? renderTemplate(template.body, { company: company!.name, inviter: inviter?.full_name ?? "A teammate", link: `/accept-invite?token=${token}` })
      : `Join ${company!.name} on RecruitCandidates: /accept-invite?token=${token}`;

    await sendEmail({ companyId, type: "team_invitation", to: email, subject, body, createdBy: invitedBy });

    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    await createAdminSupabaseClient().rpc("increment_usage", { p_company_id: companyId, p_metric: "team_members" });

    return invitation as TeamInvitation;
  }

  const invitation: TeamInvitation = {
    id: id(),
    company_id: companyId,
    email,
    role,
    token_hash: hashToken(token),
    invited_by: invitedBy,
    expires_at: daysFromNow(7),
    accepted_at: null,
    status: "pending",
  };
  mockStore.teamInvitations.push(invitation);

  const company = mockStore.companies.find((c) => c.id === companyId)!;
  const inviter = mockStore.companyMembers.find((m) => m.user_id === invitedBy);
  const template = await getTemplate(companyId, "team_invitation");
  const subject = template ? renderTemplate(template.subject, { company: company.name }) : `You've been invited to join ${company.name}`;
  const body = template
    ? renderTemplate(template.body, { company: company.name, inviter: inviter?.full_name ?? "A teammate", link: `/accept-invite?token=${token}` })
    : `Join ${company.name} on RecruitCandidates: /accept-invite?token=${token}`;

  await sendEmail({ companyId, type: "team_invitation", to: email, subject, body, createdBy: invitedBy });

  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (usage) usage.team_members += 1;

  return invitation;
}

export async function revokeInvitation(companyId: string, invitationId: string) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("team_invitations")
      .update({ status: "revoked" })
      .eq("company_id", companyId)
      .eq("id", invitationId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as TeamInvitation | null) ?? null;
  }

  const invitation = mockStore.teamInvitations.find((i) => i.company_id === companyId && i.id === invitationId);
  if (!invitation) return null;
  invitation.status = "revoked";
  return invitation;
}

export async function updateMemberRole(companyId: string, memberId: string, role: CompanyRole) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("company_members").update({ role }).eq("company_id", companyId).eq("id", memberId).select("*").maybeSingle();
    if (error) throw error;
    return (data as CompanyMember | null) ?? null;
  }

  const member = mockStore.companyMembers.find((m) => m.company_id === companyId && m.id === memberId);
  if (!member) return null;
  member.role = role;
  return member;
}

export async function removeMember(companyId: string, memberId: string) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { error, count } = await supabase.from("company_members").delete({ count: "exact" }).eq("company_id", companyId).eq("id", memberId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  const idx = mockStore.companyMembers.findIndex((m) => m.company_id === companyId && m.id === memberId);
  if (idx === -1) return false;
  mockStore.companyMembers.splice(idx, 1);
  return true;
}
