import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { WhatsAppSubnav } from "@/components/whatsapp/whatsapp-subnav";
import { Card, CardContent } from "@/components/ui/card";
import { AutomationRulesTable } from "./automation-rules-table";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALL_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST", "DEAD"];

export default async function WhatsAppAutomationsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const [rules, templates] = await Promise.all([
    prisma.automationRule.findMany({ where: { organizationId } }),
    prisma.whatsAppTemplate.findMany({
      where: { organizationId, status: "APPROVED" },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = ALL_STATUSES.map((status) => ({
    triggerStatus: status,
    rule: rules.find((r) => r.triggerStatus === status) ?? null,
  }));

  const canManage = session!.user.role === "OWNER" || session!.user.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Choose which WhatsApp template fires automatically when a lead's status changes."
      />
      <WhatsAppSubnav />

      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-sm text-muted-foreground">
            When a lead&apos;s status changes, the matching template below is sent automatically on your connected
            WhatsApp number. Leave a row set to <span className="font-medium text-foreground">— none —</span> to
            take no automatic action for that status.
          </p>
          <AutomationRulesTable
            rows={rows.map((r) => ({
              triggerStatus: r.triggerStatus,
              templateId: r.rule?.templateId ?? null,
              delayMinutes: r.rule?.delayMinutes ?? 0,
              isActive: r.rule?.isActive ?? true,
            }))}
            templates={templates.map((t) => ({ id: t.id, name: t.name, language: t.language }))}
            readOnly={!canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
