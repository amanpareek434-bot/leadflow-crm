import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

// Queue names — shared between producers (app routes) and the worker process.
export const QUEUE_NAMES = {
  WHATSAPP_SEND: "whatsapp-send",
  WEBHOOK_DELIVERY: "webhook-delivery",
  ADS_SYNC: "ads-sync",
  AUTOMATION: "automation-trigger",
} as const;

export type WhatsappSendJob = {
  organizationId: string;
  leadId?: string;
  toPhone: string;
  templateId?: string;
  bodyText?: string; // used for free-form/session messages (inbox replies)
  variables?: Record<string, string>;
};

export type WebhookDeliveryJob = {
  subscriptionId: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
};

export type AdsSyncJob = {
  organizationId: string;
  integrationType: "META_ADS" | "GOOGLE_ADS" | "SHOPIFY";
};

export type AutomationTriggerJob = {
  organizationId: string;
  leadId: string;
  status: string;
};

function makeQueue<T>(name: string) {
  return new Queue<T>(name, { connection: getRedisConnection() });
}

// Lazily instantiate so importing this module doesn't require REDIS_URL at
// build time (Next.js statically analyzes route files during `next build`).
let _whatsappQueue: Queue<WhatsappSendJob> | null = null;
let _webhookQueue: Queue<WebhookDeliveryJob> | null = null;
let _adsSyncQueue: Queue<AdsSyncJob> | null = null;
let _automationQueue: Queue<AutomationTriggerJob> | null = null;

export function whatsappQueue() {
  return (_whatsappQueue ??= makeQueue<WhatsappSendJob>(QUEUE_NAMES.WHATSAPP_SEND));
}
export function webhookQueue() {
  return (_webhookQueue ??= makeQueue<WebhookDeliveryJob>(QUEUE_NAMES.WEBHOOK_DELIVERY));
}
export function adsSyncQueue() {
  return (_adsSyncQueue ??= makeQueue<AdsSyncJob>(QUEUE_NAMES.ADS_SYNC));
}
export function automationQueue() {
  return (_automationQueue ??= makeQueue<AutomationTriggerJob>(QUEUE_NAMES.AUTOMATION));
}
