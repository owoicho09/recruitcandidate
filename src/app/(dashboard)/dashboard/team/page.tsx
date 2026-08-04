import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { listMembers, listInvitations } from "@/lib/services/team";
import { Card } from "@/components/ui/card";
import { InviteMemberDialog } from "@/components/dashboard/invite-member-dialog";
import { TeamMemberRow } from "@/components/dashboard/team-member-row";
import { InvitationRow } from "@/components/dashboard/invitation-row";
import { hasAtLeastRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const session = await requireSession();
  const [members, invitations] = await Promise.all([listMembers(session.companyId), listInvitations(session.companyId)]);
  const canManage = hasAtLeastRole(session.role, "admin");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-foreground-muted">{members.length} members</p>
        </div>
        {canManage && <InviteMemberDialog />}
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Members</p>
        <div className="flex flex-col gap-2">
          {members.map((m) => <TeamMemberRow key={m.id} member={m} canManage={canManage} />)}
        </div>
      </Card>

      {invitations.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Pending invitations</p>
          <div className="flex flex-col gap-2">
            {invitations.map((i) => <InvitationRow key={i.id} invitation={i} />)}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-sm font-semibold text-foreground">Roles</p>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-foreground-muted sm:grid-cols-2">
          <p><strong className="text-foreground">Owner</strong> — full company access, billing, settings, team, deletion.</p>
          <p><strong className="text-foreground">Admin</strong> — all recruitment operations and company settings.</p>
          <p><strong className="text-foreground">Recruiter</strong> — jobs, applicants, pipeline, assessments, videos, notes, emails.</p>
          <p><strong className="text-foreground">Hiring Manager</strong> — assigned jobs and candidates, reviews, notes, qualification.</p>
          <p><strong className="text-foreground">Reviewer</strong> — read/review assigned candidates and add notes.</p>
        </div>
      </Card>
    </div>
  );
}
