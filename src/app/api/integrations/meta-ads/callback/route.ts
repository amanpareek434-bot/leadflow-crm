import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptJson, decryptJson } from "@/lib/encryption";
import { exchangeMetaCode } from "@/lib/integrations/meta-ads";
import { decodeOAuthState } from "@/lib/integrations/oauth-state";

// GET /api/integrations/meta-ads/callback — Meta redirects here with ?code&state.
// No session available (this is a server-to-browser-to-server redirect from Meta,
// not an authenticated fetch), so the organizationId travels inside `state`.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error_message") ?? searchParams.get("error");
    if (oauthError) throw new Error(`Meta denied the request: ${oauthError}`);
    if (!code || !state) throw new Error("Missing code or state");

    const { organizationId } = decodeOAuthState<{ organizationId: string }>(state);
    if (!organizationId) throw new Error("Invalid state");

    const result = await exchangeMetaCode(code);

    // adAccountId/formIds start empty — the org admin fills these in via the
    // "Configure" inline form on the Integrations page (PATCH .../meta-ads/settings)
    // before there's anything for the ads-sync worker to pull. Preserve any
    // values already set if this is a re-connect.
    const existing = await prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: "META_ADS" } },
    });
    const prior = existing?.credentials ? decryptJson<Record<string, any>>(existing.credentials) : {};

    const credentials = encryptJson({
      accessToken: result.access_token,
      adAccountId: prior.adAccountId ?? "",
      formIds: prior.formIds ?? [],
    });

    await prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: "META_ADS" } },
      update: { status: "CONNECTED", credentials, lastError: null },
      create: { organizationId, type: "META_ADS", status: "CONNECTED", credentials },
    });

    return NextResponse.redirect(new URL("/integrations?connected=meta_ads", req.url));
  } catch (err) {
    console.error("GET /api/integrations/meta-ads/callback failed", err);
    return NextResponse.redirect(new URL("/integrations?error=meta_ads", req.url));
  }
}
