import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatPaise, formatNumber, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Contacts" description={`${contacts.length} contact${contacts.length === 1 ? "" : "s"}`} />

      <Card>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Contacts from Shopify will appear here once connected — see Integrations.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Total spend</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.source}</Badge>
                    </TableCell>
                    <TableCell>{formatPaise(c.totalSpendPaise)}</TableCell>
                    <TableCell>{formatNumber(c.ordersCount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
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
