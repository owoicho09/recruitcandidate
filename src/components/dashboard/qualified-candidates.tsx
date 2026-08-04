"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GitCompare, X, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreRing } from "@/components/ui/score-ring";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils/format";
import type { QualifiedGroup, QualifiedCandidateRow } from "@/lib/services/qualified";

export function QualifiedCandidates({ groups }: { groups: QualifiedGroup[] }) {
  const router = useRouter();
  const toast = useToast();
  const [compareSet, setCompareSet] = React.useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = React.useState(false);

  function toggleCompare(id: string) {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  async function removeFromQualified(applicationId: string) {
    const res = await fetch(`/api/applications/${applicationId}/stage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "shortlisted" }) });
    if (res.ok) {
      toast.success("Removed from qualified");
      router.refresh();
    }
  }

  const allCandidates = groups.flatMap((g) => g.candidates);
  const compareRows = allCandidates.filter((c) => compareSet.has(c.application.id));

  return (
    <div className="flex flex-col gap-10">
      {compareSet.size > 0 && (
        <div className="sticky top-20 z-10 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-accent">{compareSet.size} selected to compare</span>
          <Button size="sm" onClick={() => setCompareOpen(true)}><GitCompare className="size-4" /> Compare</Button>
          <Button size="sm" variant="ghost" onClick={() => setCompareSet(new Set())}>Clear</Button>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.job.id} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{group.job.title}</h2>
              <p className="text-sm text-foreground-muted">{group.candidates.length} qualified · {group.openings} openings · updated {formatDate(group.lastUpdated)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.candidates.map((row) => (
              <QualifiedCard key={row.application.id} row={row} selected={compareSet.has(row.application.id)} onToggleCompare={() => toggleCompare(row.application.id)} onRemove={() => removeFromQualified(row.application.id)} />
            ))}
          </div>
        </div>
      ))}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare candidates</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Candidate</TableHeadCell>
                <TableHeadCell>CV</TableHeadCell>
                <TableHeadCell>Assessment</TableHeadCell>
                <TableHeadCell>Video</TableHeadCell>
                <TableHeadCell>Combined</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {compareRows.map((row) => (
                <TableRow key={row.application.id}>
                  <TableCell className="font-medium text-foreground">{row.candidate.first_name} {row.candidate.last_name}</TableCell>
                  <TableCell>{row.cvScore ?? "—"}</TableCell>
                  <TableCell>{row.assessmentScore ?? "—"}</TableCell>
                  <TableCell>{row.videoScore ?? "—"}</TableCell>
                  <TableCell className="font-semibold text-accent">{row.combinedScore ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QualifiedCard({ row, selected, onToggleCompare, onRemove }: { row: QualifiedCandidateRow; selected: boolean; onToggleCompare: () => void; onRemove: () => void }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={selected} onCheckedChange={onToggleCompare} />
          <p className="text-sm font-semibold text-foreground">{row.candidate.first_name} {row.candidate.last_name}</p>
        </div>
        <ScoreRing score={row.combinedScore} size={40} label="Combined" />
      </div>
      <div className="flex gap-4 text-xs text-foreground-muted">
        <span>CV {row.cvScore ?? "—"}</span>
        <span>Assessment {row.assessmentScore ?? "—"}</span>
        <span>Video {row.videoScore ?? "—"}</span>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Link href={`/dashboard/applicants/${row.application.id}`} className="flex items-center gap-1 text-sm text-accent hover:underline">
          <ExternalLink className="size-3.5" /> View profile
        </Link>
        <button onClick={onRemove} className="flex items-center gap-1 text-xs text-foreground-muted hover:text-danger">
          <X className="size-3.5" /> Remove
        </button>
      </div>
    </Card>
  );
}
