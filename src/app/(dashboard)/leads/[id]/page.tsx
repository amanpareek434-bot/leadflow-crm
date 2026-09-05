import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { LeadDetailClient } from "./lead-detail-client";

export const dynamic = "force-dynamic";

const WHATSAPP_STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  QUEUED: "secondary",
  SENT: "default",
  DELIVERED: "default",
  READ: "success",
  FAILED: "destructive",
};

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  if (!lead) notFound();

  const [activities, whatsappMessages, orgUsers] = await Promise.all([
    prisma.activity.findMany({
      where: { organizationId, leadId: lead.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whatsAppMessageLog.findMany({
      where: { organizationId, leadId: lead.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title={lead.name} description={lead.company ?? "No company on file"} />

      <LeadDetailClient
        lead={{
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          value: lead.value,
          assignedToId: lead.assignedToId,
        }}
        activities={activities.map((a) => ({
          id: a.id,
          type: a.type,
          body: a.body,
          createdAt: a.createdAt.toISOString(),
          user: a.user,
        }))}
        orgUsers={orgUsers}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>WhatsApp messages</CardTitle>
        </CardHeader>
        <CardContent>
          {whatsappMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WhatsApp messages sent to this lead yet.</p>
          ) : (
            <div className="space-y-3">
              {whatsappMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={WHATSAPP_STATUS_VARIANT[m.status] ?? "secondary"}>{m.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
                  </div>
                  {m.body && <p className="mt-2 text-sm">{m.body}</p>}
                  {m.errorMessage && <p className="mt-1 text-xs text-destructive">{m.errorMessage}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
