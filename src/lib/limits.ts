import { prisma } from "@/lib/prisma";
import { currentPeriodKey } from "@/lib/utils";

/**
 * Plan-limit enforcement. Each org has a Subscription -> Plan with maxUsers /
 * maxLeads / maxWhatsappPerMo. UsageCounter rows track monthly usage per metric.
 */

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

async function getPlanForOrg(organizationId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
  return sub?.plan ?? null;
}

export async function assertUnderLeadLimit(organizationId: string) {
  const plan = await getPlanForOrg(organizationId);
  if (!plan) return; // no subscription yet (e.g. mid-onboarding) — don't block
  const total = await prisma.lead.count({ where: { organizationId } });
  if (total >= plan.maxLeads) {
    throw new PlanLimitError(
      `Your plan (${plan.name}) allows up to ${plan.maxLeads} leads. Upgrade to add more.`
    );
  }
}

export async function assertUnderUserLimit(organizationId: string) {
  const plan = await getPlanForOrg(organizationId);
  if (!plan) return;
  const total = await prisma.user.count({ where: { organizationId, isActive: true } });
  if (total >= plan.maxUsers) {
    throw new PlanLimitError(
      `Your plan (${plan.name}) allows up to ${plan.maxUsers} team members. Upgrade to invite more.`
    );
  }
}

export async function assertUnderWhatsappLimit(organizationId: string) {
  const plan = await getPlanForOrg(organizationId);
  if (!plan) return;
  const periodKey = currentPeriodKey();
  const counter = await prisma.usageCounter.findUnique({
    where: { organizationId_metric_periodKey: { organizationId, metric: "whatsapp_messages", periodKey } },
  });
  if ((counter?.count ?? 0) >= plan.maxWhatsappPerMo) {
    throw new PlanLimitError(
      `Your plan (${plan.name}) allows ${plan.maxWhatsappPerMo} WhatsApp messages/month. Upgrade to send more.`
    );
  }
}

export async function incrementUsage(organizationId: string, metric: "leads" | "whatsapp_messages", by = 1) {
  const periodKey = currentPeriodKey();
  await prisma.usageCounter.upsert({
    where: { organizationId_metric_periodKey: { organizationId, metric, periodKey } },
    update: { count: { increment: by } },
    create: { organizationId, metric, periodKey, count: by },
  });
}
