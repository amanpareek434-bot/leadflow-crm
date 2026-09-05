import { prisma } from "@/lib/prisma";
import { whatsappQueue } from "@/lib/queue/queues";
import { emitEvent } from "@/lib/webhooks";
import type { LeadStatus } from "@prisma/client";

/**
 * Core of the "status -> WhatsApp template" feature the user asked for:
 * when a lead's status changes to e.g. LOST / DEAD / WON, look up the org's
 * AutomationRule for that status and queue the matching approved template.
 * Call this from every place a lead's status can change (manual UI edit,
 * pipeline drag-drop, public API, integration sync).
 */
export async function handleLeadStatusChange(leadId: string, organizationId: string, newStatus: LeadStatus) {
  await emitEvent(organizationId, "lead.status_changed", { leadId, status: newStatus });

  const rule = await prisma.automationRule.findUnique({
    where: { organizationId_triggerStatus: { organizationId, triggerStatus: newStatus } },
    include: { template: true },
  });
  if (!rule || !rule.isActive || rule.template.status !== "APPROVED") return;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead?.phone) return;

  try {
    await whatsappQueue().add(
      "send",
      {
        organizationId,
        leadId,
        toPhone: lead.phone,
        templateId: rule.templateId,
        variables: { "1": lead.name },
      },
      { delay: rule.delayMinutes * 60_000, attempts: 3, backoff: { type: "exponential", delay: 10_000 } }
    );
  } catch (err) {
    console.error("Failed to enqueue automation WhatsApp send", err);
  }
}
