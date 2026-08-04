import type { Metadata } from "next";
import { listCompaniesForAdmin } from "@/lib/services/platform-admin";
import { listMembers } from "@/lib/services/team";
import { Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";

export const metadata: Metadata = { title: "Platform Admin — Users" };

export default async function PlatformAdminUsersPage() {
  const companies = await listCompaniesForAdmin();
  const rows = (await Promise.all(companies.map(async ({ company }) => {
    const members = await listMembers(company.id);
    return members.map((m) => ({ member: m, company }));
  }))).flat();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-foreground-muted">{rows.length} users across all companies</p>
      </div>
      <Table>
        <TableHead><tr><TableHeadCell>Name</TableHeadCell><TableHeadCell>Email</TableHeadCell><TableHeadCell>Company</TableHeadCell><TableHeadCell>Role</TableHeadCell><TableHeadCell>Status</TableHeadCell></tr></TableHead>
        <TableBody>
          {rows.map(({ member, company }) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium text-foreground">{member.full_name}</TableCell>
              <TableCell className="text-foreground-muted">{member.email}</TableCell>
              <TableCell className="text-foreground-muted">{company.name}</TableCell>
              <TableCell className="capitalize text-foreground-muted">{member.role.replace("_", " ")}</TableCell>
              <TableCell><StatusChip tone={member.status === "active" ? "success" : "neutral"}>{member.status}</StatusChip></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
