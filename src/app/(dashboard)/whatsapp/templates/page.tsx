import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { WhatsAppSubnav } from "@/components/whatsapp/whatsapp-subnav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { SyncTemplatesButton, AddTemplateDialog } from "./template-actions";
import type { WhatsAppTemplateStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<WhatsAppTemplateStatus, "success" | "warning" | "destructive"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
};

export default async function WhatsAppTemplatesPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const templates = await prisma.whatsAppTemplate.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="WhatsApp templates"
        description="Templates approved on your connected WhatsApp Business number."
        actions={
          <>
            <SyncTemplatesButton />
            <AddTemplateDialog />
          </>
        }
      />
      <WhatsAppSubnav />

      <Card>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No templates yet. Sync from WhatsApp or add one manually to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Body preview</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.language}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{t.bodyText}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
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
