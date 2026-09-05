/**
 * Official WhatsApp Business Platform (Meta Cloud API) client.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * PER-ORGANIZATION, not per-deployment: each customer connects their OWN
 * WhatsApp number (Phone Number ID + WABA ID + Access Token), stored
 * encrypted on their `Integration` row (type WHATSAPP) — same pattern as
 * Meta Ads / Google Ads / Shopify. See getWhatsAppCredentialsForOrg() below.
 *
 * WHATSAPP_APP_SECRET and WHATSAPP_WEBHOOK_VERIFY_TOKEN stay as env vars —
 * those belong to the ONE Meta App you (the platform owner) register; every
 * customer's WhatsApp number sends its webhook events through that same app,
 * so there's exactly one app secret / verify token for the whole deployment,
 * not one per customer.
 */
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/encryption";

const GRAPH_VERSION = "v20.0";

function apiUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
}

export type WhatsAppCredentials = {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
};

/** Reads and decrypts the calling org's WhatsApp Integration row. Throws a friendly error if not connected. */
export async function getWhatsAppCredentialsForOrg(organizationId: string): Promise<WhatsAppCredentials> {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_type: { organizationId, type: "WHATSAPP" } },
  });
  if (!integration || integration.status !== "CONNECTED" || !integration.credentials) {
    throw new Error("WhatsApp isn't connected yet — go to Integrations and add your Phone Number ID / Access Token.");
  }
  return decryptJson<WhatsAppCredentials>(integration.credentials);
}

/** Looks up which org owns a given WhatsApp phone_number_id — used by the shared inbound webhook to route events. */
export async function findOrgByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const integrations = await prisma.integration.findMany({ where: { type: "WHATSAPP", status: "CONNECTED" } });
  for (const integ of integrations) {
    if (!integ.credentials) continue;
    try {
      const creds = decryptJson<WhatsAppCredentials>(integ.credentials);
      if (creds.phoneNumberId === phoneNumberId) return integ.organizationId;
    } catch {
      // skip malformed/undecryptable rows rather than failing the whole lookup
    }
  }
  return null;
}

export type SendTemplateArgs = {
  toPhone: string; // E.164, e.g. 9198xxxxxxx (no leading +)
  templateName: string;
  languageCode: string;
  bodyParams?: string[]; // positional {{1}}, {{2}}... values
};

export async function sendWhatsAppTemplate(creds: WhatsAppCredentials, args: SendTemplateArgs) {
  const res = await fetch(apiUrl(`${creds.phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
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

export async function sendWhatsAppFreeText(creds: WhatsAppCredentials, toPhone: string, body: string) {
  const res = await fetch(apiUrl(`${creds.phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
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
export async function fetchApprovedTemplates(creds: WhatsAppCredentials) {
  const res = await fetch(apiUrl(`${creds.businessAccountId}/message_templates?limit=100`), {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
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

export type CreateTemplateArgs = {
  name: string; // lowercase, letters/numbers/underscores only — Meta rejects anything else
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  bodyText: string;
};

/**
 * Submits a brand-new template to Meta for review — this is the ONLY way a
 * template actually becomes usable; there is no "mark it approved yourself"
 * option, because a template that isn't genuinely approved on Meta's systems
 * will simply fail at send time no matter what status is stored locally.
 * Returns Meta's id + starting status (normally "PENDING" — reviews usually
 * take anywhere from a few minutes to about a day).
 */
export async function createWhatsAppTemplate(creds: WhatsAppCredentials, args: CreateTemplateArgs) {
  const res = await fetch(apiUrl(`${creds.businessAccountId}/message_templates`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: args.name,
      language: args.language,
      category: args.category,
      components: [{ type: "BODY", text: args.bodyText }],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.error_user_msg ?? json?.error?.message ?? `Meta rejected the template (${res.status})`);
  }
  return json as { id: string; status: string; category: string };
}

/** Verifies the X-Hub-Signature-256 header Meta sends on every webhook POST (uses the platform-wide WHATSAPP_APP_SECRET). */
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
