import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { WhatsAppSubnav } from "@/components/whatsapp/whatsapp-subnav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { SendMessageForm } from "./send-message-form";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { MessageStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<MessageStatus, "success" | "warning" | "destructive"> = {
  SENT: "success",
  DELIVERED: "success",
  READ: "success",
  QUEUED: "warning",
  FAILED: "destructive",
};

export default async function WhatsAppInboxPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const messages = await prisma.whatsAppMessageLog.findMany({
    where: { organizationId },
    include: { lead: { select: { id: true, name: true } }, template: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="WhatsApp inbox" description="Recent outbound and inbound WhatsApp messages for your org." />
      <WhatsAppSubnav />

      <SendMessageForm />

      <Card>
        <CardContent className="p-0">
          {messages.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No WhatsApp messages yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.direction === "OUTBOUND" ? (
                        <span className="flex items-center gap-1.5 text-primary">
                          <ArrowUpRight className="h-4 w-4" /> Out
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <ArrowDownLeft className="h-4 w-4" /> In
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{m.lead?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.toPhone}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {m.body || (m.template ? `Template: ${m.template.name}` : "—")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
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
