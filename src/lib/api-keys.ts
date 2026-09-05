import crypto from "crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

// Public "outgoing API" keys — a customer's ERP/Sheets script authenticates
// with `Authorization: Bearer crm_live_xxxxxxxxxxxx` against /api/v1/*.

const PREFIX = "crm_live_";

export function generateApiKey(): { fullKey: string; keyPrefix: string; keyHash: string } {
  const secret = nanoid(32);
  const fullKey = `${PREFIX}${secret}`;
  const keyPrefix = fullKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
  return { fullKey, keyPrefix, keyHash };
}

export async function verifyApiKey(fullKey: string | null) {
  if (!fullKey || !fullKey.startsWith(PREFIX)) return null;
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
  const record = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    include: { organization: true },
  });
  if (!record) return null;
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return record;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
