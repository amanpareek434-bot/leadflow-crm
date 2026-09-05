/**
 * Official WhatsApp Business Platform (Meta Cloud API) client.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Credentials come from env vars (one WhatsApp Business number per deployment)
 * — see .env.example: WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN.
 * (Multi-number-per-tenant is possible by moving these onto the Integration
 * model's encrypted credentials instead; env vars keep the common case simple.)
 */

const GRAPH_VERSION = "v20.0";

function apiUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured — set it in your environment to send WhatsApp messages.`);
  return v;
}

export type SendTemplateArgs = {
  toPhone: string; // E.164, e.g. 9198xxxxxxx (no leading +)
  templateName: string;
  languageCode: string;
  bodyParams?: string[]; // positional {{1}}, {{2}}... values
};

export async function sendWhatsAppTemplate(args: SendTemplateArgs) {
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: args.toPhone,
      type: "template",
      template: {
        name: args.templateName,
        language: { code: args.languageCode },
        ...(args.bodyParams && args.bodyParams.length > 0
          ? { components: [{ type: "body", parameters: args.bodyParams.map((text) => ({ type: "text", text })) }] }
          : {}),
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `WhatsApp send failed (${res.status})`);
  }
  return json as { messages: { id: string }[] };
}

export async function sendWhatsAppFreeText(toPhone: string, body: string) {
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `WhatsApp send failed (${res.status})`);
  return json as { messages: { id: string }[] };
}

/** Fetch message templates approved on the connected WhatsApp Business Account. */
export async function fetchApprovedTemplates() {
  const wabaId = requireEnv("WHATSAPP_BUSINESS_ACCOUNT_ID");
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(apiUrl(`${wabaId}/message_templates?limit=100`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to fetch WhatsApp templates");
  return json.data as Array<{
    id: string;
    name: string;
    language: string;
    category: string;
    status: string;
    components: Array<{ type: string; text?: string }>;
  }>;
}

/** Verifies the X-Hub-Signature-256 header Meta sends on every webhook POST. */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;
  const crypto = require("crypto") as typeof import("crypto");
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
