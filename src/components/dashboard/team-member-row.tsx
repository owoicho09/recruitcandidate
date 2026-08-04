"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import type { CompanyMember, CompanyRole } from "@/types/database";

export function TeamMemberRow({ member, canManage }: { member: CompanyMember; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();

  async function changeRole(role: CompanyRole) {
    const res = await fetch(`/api/team/members/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    if (res.ok) { toast.success("Role updated"); router.refresh(); }
  }

  async function remove() {
    const res = await fetch(`/api/team/members/${member.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Member removed"); router.refresh(); }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <Avatar name={member.full_name} size="sm" />
        <div>
          <p className="text-sm font-medium text-foreground">{member.full_name}</p>
          <p className="text-xs text-foreground-muted">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {member.role === "owner" || !canManage ? (
          <span className="text-sm capitalize text-foreground-muted">{member.role.replace("_", " ")}</span>
        ) : (
          <Select value={member.role} onValueChange={(v) => changeRole(v as CompanyRole)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
            </SelectContent>
          </Select>
        )}
        {canManage && member.role !== "owner" && (
          <button onClick={remove} className="rounded-md p-2 text-foreground-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
