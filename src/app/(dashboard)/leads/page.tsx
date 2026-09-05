import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatDate } from "@/lib/utils";
import { NewLeadDialog } from "./new-lead-dialog";
import { StatusFilter } from "./status-filter";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const status = searchParams.status as LeadStatus | undefined;

  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
    },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${leads.length} lead${leads.length === 1 ? "" : "s"}${status ? ` · filtered by ${LEAD_STATUS_LABELS[status]}` : ""}`}
        actions={<NewLeadDialog />}
      />

      <div className="mb-4 flex items-center gap-3">
        <StatusFilter current={status} />
      </div>

      <Card>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No leads yet. Click "Add Lead" to create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.name}
                      </Link>
                      {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                    </TableCell>
                    <TableCell>{lead.phone ?? "—"}</TableCell>
                    <TableCell>{lead.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={LEAD_STATUS_COLORS[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.source}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.assignedTo?.name ?? "Unassigned"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
