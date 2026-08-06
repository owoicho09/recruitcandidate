"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, ClipboardList, Video, Award, PauseCircle, XCircle, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { RejectionModal } from "@/components/dashboard/rejection-modal";
import type { Application, CompanyMember } from "@/types/database";

export function CandidateActions({ application, members, hasAssessment, hasVideoInterview }: { application: Application; members: CompanyMember[]; hasAssessment: boolean; hasVideoInterview: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const busy = busyAction !== null;

  async function moveStage(stage: string, label: string) {
    setBusyAction(stage);
    const res = await fetch(`/api/applications/${application.id}/stage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    setBusyAction(null);
    if (res.ok) {
      toast.success(`Moved to ${label}`);
      router.refresh();
    } else {
      toast.error("Couldn't update stage");
    }
  }

  async function sendAssessment() {
    setBusyAction("assessment");
    const res = await fetch("/api/assessments/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: application.id }) });
    setBusyAction(null);
    if (res.ok) { toast.success("Assessment sent"); router.refresh(); }
    else toast.error("Couldn't send assessment", (await res.json().catch(() => ({}))).error);
  }

  async function sendVideo() {
    setBusyAction("video");
    const res = await fetch("/api/video-interviews/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: application.id }) });
    setBusyAction(null);
    if (res.ok) { toast.success("Video interview sent"); router.refresh(); }
    else toast.error("Couldn't send video interview", (await res.json().catch(() => ({}))).error);
  }

  async function assign(memberId: string | null) {
    setBusyAction("assign");
    const res = await fetch(`/api/applications/${application.id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId }) });
    setBusyAction(null);
    if (res.ok) { toast.success("Assigned"); router.refresh(); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {application.stage !== "shortlisted" && application.stage !== "rejected" && (
        <Button size="sm" variant="secondary" loading={busyAction === "shortlisted"} disabled={busy} onClick={() => moveStage("shortlisted", "Shortlisted")}><Star className="size-4" /> Shortlist</Button>
      )}
      {hasAssessment && <Button size="sm" variant="secondary" loading={busyAction === "assessment"} disabled={busy} onClick={sendAssessment}><ClipboardList className="size-4" /> Send assessment</Button>}
      {hasVideoInterview && <Button size="sm" variant="secondary" loading={busyAction === "video"} disabled={busy} onClick={sendVideo}><Video className="size-4" /> Send video interview</Button>}
      {application.stage !== "qualified" && (
        <Button size="sm" variant="secondary" loading={busyAction === "qualified"} disabled={busy} onClick={() => moveStage("qualified", "Qualified")}><Award className="size-4" /> Move to qualified</Button>
      )}
      {application.stage !== "on_hold" && (
        <Button size="sm" variant="secondary" loading={busyAction === "on_hold"} disabled={busy} onClick={() => moveStage("on_hold", "On hold")}><PauseCircle className="size-4" /> Put on hold</Button>
      )}
      {application.stage !== "rejected" && (
        <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejectOpen(true)}><XCircle className="size-4" /> Reject</Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" loading={busyAction === "assign"} disabled={busy}><UserCog className="size-4" /> Assign</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {members.map((m) => (
            <DropdownMenuItem key={m.id} onClick={() => assign(m.user_id)}>{m.full_name} · {m.role.replace("_", " ")}</DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => assign(null)}>Unassign</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RejectionModal application={application} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}
