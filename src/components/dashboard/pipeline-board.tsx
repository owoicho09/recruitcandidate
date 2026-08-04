"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { stageMap } from "@/lib/status-maps";
import type { ApplicantRow } from "@/lib/services/applications";
import type { ApplicationStage, CompanyMember } from "@/types/database";

const COLUMNS: ApplicationStage[] = ["applied", "cv_screened", "shortlisted", "assessment", "video_interview", "qualified", "on_hold", "rejected"];

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export function PipelineBoard({ rows, members }: { rows: ApplicantRow[]; members: CompanyMember[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = React.useState(rows);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Resync local drag state whenever the server-refreshed `rows` prop changes
  // (after router.refresh() following a drag or on initial load).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setItems(rows), [rows]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const applicationId = String(active.id);
    const newStage = String(over.id) as ApplicationStage;
    const current = items.find((r) => r.application.id === applicationId);
    if (!current || current.application.stage === newStage) return;

    setItems((prev) => prev.map((r) => (r.application.id === applicationId ? { ...r, application: { ...r.application, stage: newStage } } : r)));

    const res = await fetch(`/api/applications/${applicationId}/stage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
    if (res.ok) {
      toast.success(`Moved to ${stageMap[newStage].label}`);
      router.refresh();
    } else {
      toast.error("Couldn't move candidate");
      setItems(rows);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => (
          <PipelineColumn key={stage} stage={stage} rows={items.filter((r) => r.application.stage === stage)} members={members} />
        ))}
      </div>
    </DndContext>
  );
}

function PipelineColumn({ stage, rows, members }: { stage: ApplicationStage; rows: ApplicantRow[]; members: CompanyMember[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div ref={setNodeRef} className={cn("flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-3 transition-colors", isOver && "border-accent bg-accent-soft/40")}>
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-foreground">{stageMap[stage].label}</p>
        <span className="text-xs text-foreground-muted">{rows.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => <PipelineCard key={row.application.id} row={row} members={members} />)}
        {rows.length === 0 && <p className="px-1 py-6 text-center text-xs text-foreground-muted">No candidates</p>}
      </div>
    </div>
  );
}

function PipelineCard({ row, members }: { row: ApplicantRow; members: CompanyMember[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.application.id });
  const assignedMember = members.find((m) => m.user_id === row.application.assigned_member_id);

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab p-3 active:cursor-grabbing", isDragging && "opacity-50 shadow-lg z-10 relative")}
    >
      <Link href={`/dashboard/applicants/${row.application.id}`} onClick={(e) => isDragging && e.preventDefault()} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar name={`${row.candidate.first_name} ${row.candidate.last_name}`} size="sm" />
            <div>
              <p className="text-sm font-medium text-foreground">{row.candidate.first_name} {row.candidate.last_name}</p>
              <p className="text-xs text-foreground-muted">{row.jobTitle}</p>
            </div>
          </div>
          {row.cvScore !== null && <ScoreRing score={row.cvScore} size={32} />}
        </div>
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span>{daysSince(row.application.stage_updated_at)}d in stage</span>
          {assignedMember && <span>{assignedMember.full_name.split(" ")[0]}</span>}
        </div>
      </Link>
    </Card>
  );
}
