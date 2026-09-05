import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatPaise, formatDate } from "@/lib/utils";
import { NewDealDialog, DealActions } from "./deals-client";

export const dynamic = "force-dynamic";

function dealStatus(won: boolean | null): { label: string; variant: "secondary" | "success" | "destructive" } {
  if (won === true) return { label: "Won", variant: "success" };
  if (won === false) return { label: "Lost", variant: "destructive" };
  return { label: "Open", variant: "secondary" };
}

export default async function DealsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const [deals, leads] = await Promise.all([
    prisma.deal.findMany({
      where: { organizationId },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.lead.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Deals"
        description={`${deals.length} deal${deals.length === 1 ? "" : "s"}`}
        actions={<NewDealDialog leads={leads} />}
      />

      <Card>
        <CardContent className="p-0">
          {deals.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No deals yet. Click "Add Deal" to link a deal to a lead.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => {
                  const status = dealStatus(deal.won);
                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>{deal.lead?.name ?? "—"}</TableCell>
                      <TableCell>{formatPaise(deal.valuePaise)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(deal.createdAt)}</TableCell>
                      <TableCell>{deal.won === null && <DealActions dealId={deal.id} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
