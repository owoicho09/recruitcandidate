"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ApplicantsTable } from "@/components/dashboard/applicants-table";
import { ApplicantCard } from "@/components/dashboard/applicant-card";
import { NoResultsState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { ApplicantRow } from "@/lib/services/applications";
import type { ApplicationStage, CompanyMember, Job } from "@/types/database";
import { stageMap } from "@/lib/status-maps";

export function ApplicantsExplorer({ rows, jobs, members }: { rows: ApplicantRow[]; jobs: Job[]; members: CompanyMember[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = React.useState("");
  const [jobFilter, setJobFilter] = React.useState("all");
  const [stageFilter, setStageFilter] = React.useState("all");
  const [recommendationFilter, setRecommendationFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = rows.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const matches = `${r.candidate.first_name} ${r.candidate.last_name} ${r.candidate.email}`.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (jobFilter !== "all" && r.application.job_id !== jobFilter) return false;
    if (stageFilter !== "all" && r.application.stage !== stageFilter) return false;
    if (recommendationFilter !== "all" && r.application.recommendation !== recommendationFilter) return false;
    if (assigneeFilter !== "all" && r.application.assigned_member_id !== assigneeFilter) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.application.id))));
  }

  async function bulkMoveStage(stage: ApplicationStage) {
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/applications/${id}/stage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) })));
    toast.success(`Moved ${selected.size} candidate${selected.size === 1 ? "" : "s"} to ${stageMap[stage].label}`);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" />
          <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Job" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {Object.entries(stageMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Recommendation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All recommendations</SelectItem>
            <SelectItem value="strong_match">Strong match</SelectItem>
            <SelectItem value="possible_match">Possible match</SelectItem>
            <SelectItem value="manual_review">Needs manual review</SelectItem>
            <SelectItem value="low_match">Low match</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Assigned to" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All team members</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.user_id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-md bg-surface-muted p-0.5">
          <button onClick={() => setView("table")} className={cn("rounded p-1.5", view === "table" && "bg-surface shadow-sm")}><ListIcon className="size-4" /></button>
          <button onClick={() => setView("cards")} className={cn("rounded p-1.5", view === "cards" && "bg-surface shadow-sm")}><LayoutGrid className="size-4" /></button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-accent">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => bulkMoveStage("shortlisted")}>Shortlist</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkMoveStage("on_hold")}>Put on hold</Button>
            <Button size="sm" variant="danger" onClick={() => bulkMoveStage("rejected")}>Reject</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <NoResultsState />
      ) : view === "table" ? (
        <ApplicantsTable rows={filtered} selected={selected} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => <ApplicantCard key={row.application.id} row={row} />)}
        </div>
      )}
    </div>
  );
}
