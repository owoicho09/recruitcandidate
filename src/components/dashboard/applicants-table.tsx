"use client";

import Link from "next/link";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { NoResultsState } from "@/components/ui/states";
import { stageMap, recommendationMap } from "@/lib/status-maps";
import { formatDate } from "@/lib/utils/format";
import type { ApplicantRow } from "@/lib/services/applications";

interface Props {
  rows: ApplicantRow[];
  showJobColumn?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (applicationId: string) => void;
  onToggleSelectAll?: () => void;
}

export function ApplicantsTable({ rows, showJobColumn = true, selected, onToggleSelect, onToggleSelectAll }: Props) {
  if (rows.length === 0) {
    return <NoResultsState description="No applicants match your filters." />;
  }

  const selectable = Boolean(selected && onToggleSelect);

  return (
    <Table>
      <TableHead>
        <tr>
          {selectable && (
            <TableHeadCell className="w-10">
              <Checkbox checked={rows.length > 0 && rows.every((r) => selected!.has(r.application.id))} onCheckedChange={onToggleSelectAll} />
            </TableHeadCell>
          )}
          <TableHeadCell>Candidate</TableHeadCell>
          {showJobColumn && <TableHeadCell>Role</TableHeadCell>}
          <TableHeadCell>Applied</TableHeadCell>
          <TableHeadCell>CV score</TableHeadCell>
          <TableHeadCell>Stage</TableHeadCell>
          <TableHeadCell>Recommendation</TableHeadCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map(({ application, candidate, jobTitle, cvScore }) => (
          <TableRow key={application.id} interactive>
            {selectable && (
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected!.has(application.id)} onCheckedChange={() => onToggleSelect!(application.id)} />
              </TableCell>
            )}
            <TableCell>
              <Link href={`/dashboard/applicants/${application.id}`} className="flex items-center gap-2.5">
                <Avatar name={`${candidate.first_name} ${candidate.last_name}`} size="sm" />
                <div>
                  <p className="font-medium text-foreground">{candidate.first_name} {candidate.last_name}</p>
                  <p className="text-xs text-foreground-muted">{candidate.email}</p>
                </div>
              </Link>
            </TableCell>
            {showJobColumn && <TableCell className="text-foreground-muted">{jobTitle}</TableCell>}
            <TableCell className="text-foreground-muted">{formatDate(application.applied_at)}</TableCell>
            <TableCell>{cvScore !== null ? cvScore : <span className="text-xs text-foreground-muted">Pending</span>}</TableCell>
            <TableCell><StatusChip tone={stageMap[application.stage].tone}>{stageMap[application.stage].label}</StatusChip></TableCell>
            <TableCell>
              {application.recommendation ? (
                <StatusChip tone={recommendationMap[application.recommendation].tone}>{recommendationMap[application.recommendation].label}</StatusChip>
              ) : (
                <span className="text-xs text-foreground-muted">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
