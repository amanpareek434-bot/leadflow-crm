import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { encryptJson } from "@/lib/encryption";
import type { WhatsAppCredentials } from "@/lib/integrations/whatsapp";

/**
 * Backend half of Meta's "WhatsApp Embedded Signup" flow — the Wati/AiSensy-
 * style one-click connect, where the customer authorizes via a Facebook
 * popup instead of copy-pasting their Phone Number ID / Access Token.
 *
 * REQUIRES you (the platform owner) to be approved by Meta as a Tech
 * Provider with WhatsApp Embedded Signup enabled — this endpoint exchanges
 * a signup `code` for an access token using YOUR Meta App's credentials
 * (META_APP_ID / META_APP_SECRET, already used for the Meta Ads integration
 * — same app, WhatsApp Embedded Signup is just another product on it). Until
 * that approval exists, `NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID` stays unset,
 * the frontend button never renders, and this route is simply never called
 * — the manual-entry flow (/api/integrations/whatsapp/settings) keeps
 * working exactly as before regardless.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup
 */

const schema = z.object({
  code: z.string().min(1),
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
});

async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    code,
  });
  const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Meta rejected the signup code");
  return json as { access_token: string; token_type: string };
}

/** Registers this app's webhook to receive events for the newly-linked WABA — required for a Tech Provider managing multiple customers' numbers on one app. */
async function subscribeAppToWaba(wabaId: string, accessToken: string) {
  await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch((err) => console.error("Failed to subscribe app to WABA webhooks", err));
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();
    const organizationId = session.user.organizationId;

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { code, phoneNumberId, wabaId } = parsed.data;

    const { access_token: accessToken } = await exchangeCodeForToken(code);
    await subscribeAppToWaba(wabaId, accessToken);

    const credentials: WhatsAppCredentials = { phoneNumberId, businessAccountId: wabaId, accessToken };

    await prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: "WHATSAPP" } },
      update: { status: "CONNECTED", credentials: encryptJson(credentials), lastError: null },
      create: { organizationId, type: "WHATSAPP", status: "CONNECTED", credentials: encryptJson(credentials) },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/whatsapp/embedded-signup failed", err);
    return NextResponse.json({ error: err?.message ?? "Something went wrong" }, { status: 400 });
  }
}
