import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { getShopifyInstallUrl } from "@/lib/integrations/shopify";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";

// GET /api/integrations/shopify/oauth?shop=mystore.myshopify.com
// Shopify needs the shop domain up front (it's per-store OAuth), so the
// "Connect" UI for Shopify collects it first, then full-page-navigates here.
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop")?.trim().toLowerCase() ?? "";
    if (!shop.endsWith(".myshopify.com")) {
      return NextResponse.json({ error: "Shop must look like mystore.myshopify.com" }, { status: 400 });
    }

    const state = encodeOAuthState({ organizationId: session.user.organizationId, shop });
    return NextResponse.redirect(getShopifyInstallUrl(shop, state));
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations/shopify/oauth failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
