/**
 * Standalone worker process — deploy as a second Railway service
 * (`npm run worker`) pointed at the same DATABASE_URL / REDIS_URL as the web
 * service. Processes background jobs so the web app never blocks on slow
 * third-party APIs (WhatsApp, webhook receivers, ad platform syncs).
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES, type WhatsappSendJob, type WebhookDeliveryJob, type AdsSyncJob } from "@/lib/queue/queues";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, sendWhatsAppFreeText } from "@/lib/integrations/whatsapp";
import { deliverWebhook } from "@/lib/webhooks";
import { incrementUsage } from "@/lib/limits";
import { runAdsSyncForOrg } from "@/lib/integrations/sync";

const connection = getRedisConnection();

const whatsappWorker = new Worker<WhatsappSendJob>(
  QUEUE_NAMES.WHATSAPP_SEND,
  async (job: Job<WhatsappSendJob>) => {
    const { organizationId, leadId, toPhone, templateId, bodyText, variables } = job.data;

    const logEntry = await prisma.whatsAppMessageLog.create({
      data: { organizationId, leadId, toPhone, templateId, body: bodyText, direction: "OUTBOUND", status: "QUEUED" },
    });

    try {
      let result;
      if (templateId) {
        const template = await prisma.whatsAppTemplate.findUniqueOrThrow({ where: { id: templateId } });
        const params = Object.values(variables ?? {});
        result = await sendWhatsAppTemplate({
          toPhone,
          templateName: template.name,
          languageCode: template.language,
          bodyParams: params,
        });
      } else if (bodyText) {
        result = await sendWhatsAppFreeText(toPhone, bodyText);
      } else {
        throw new Error("Job has neither templateId nor bodyText");
      }

      await prisma.whatsAppMessageLog.update({
        where: { id: logEntry.id },
        data: { status: "SENT", waMessageId: result.messages?.[0]?.id },
      });
      await incrementUsage(organizationId, "whatsapp_messages");
    } catch (err: any) {
      await prisma.whatsAppMessageLog.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", errorMessage: String(err?.message ?? err) },
      });
      throw err;
    }
  },
  { connection }
);

const webhookWorker = new Worker<WebhookDeliveryJob>(
  QUEUE_NAMES.WEBHOOK_DELIVERY,
  async (job: Job<WebhookDeliveryJob>) => {
    await deliverWebhook(job.data.subscriptionId, job.data.payload, job.attemptsMade + 1);
  },
  { connection }
);

const adsSyncWorker = new Worker<AdsSyncJob>(
  QUEUE_NAMES.ADS_SYNC,
  async (job: Job<AdsSyncJob>) => {
    await runAdsSyncForOrg(job.data.organizationId, job.data.integrationType);
  },
  { connection }
);

for (const w of [whatsappWorker, webhookWorker, adsSyncWorker]) {
  w.on("completed", (job) => console.log(`[${w.name}] completed job ${job.id}`));
  w.on("failed", (job, err) => console.error(`[${w.name}] job ${job?.id} failed:`, err.message));
}

console.log("CRM worker started. Listening on queues:", Object.values(QUEUE_NAMES).join(", "));
