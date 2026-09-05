import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptJson } from "@/lib/encryption";
import { exchangeShopifyCode } from "@/lib/integrations/shopify";
import { runAdsSyncForOrg } from "@/lib/integrations/sync";
import { decodeOAuthState } from "@/lib/integrations/oauth-state";

// GET /api/integrations/shopify/callback — Shopify redirects here with ?code&state
// (and its own ?shop=, which we ignore in favor of the one we round-tripped
// in `state`, since that's the value we validated before starting the flow).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) throw new Error("Missing code or state");

    const { organizationId, shop } = decodeOAuthState<{ organizationId: string; shop: string }>(state);
    if (!organizationId || !shop) throw new Error("Invalid state");

    const result = await exchangeShopifyCode(shop, code);
    const credentials = encryptJson({ shop, accessToken: result.access_token });

    await prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: "SHOPIFY" } },
      update: { status: "CONNECTED", credentials, lastError: null },
      create: { organizationId, type: "SHOPIFY", status: "CONNECTED", credentials },
    });

    // Nice-to-have: pull an immediate first batch of customers/orders. Shopify
    // credentials are fully usable right away (unlike Meta/Google Ads, which
    // still need adAccountId/formIds/customerId filled in), so this is safe.
    // Never let a sync hiccup break the OAuth redirect.
    runAdsSyncForOrg(organizationId, "SHOPIFY").catch((err) => {
      console.error("Initial Shopify sync after connect failed", err);
    });

    return NextResponse.redirect(new URL("/integrations?connected=shopify", req.url));
  } catch (err) {
    console.error("GET /api/integrations/shopify/callback failed", err);
    return NextResponse.redirect(new URL("/integrations?error=shopify", req.url));
  }
}
