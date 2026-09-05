import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { getMetaOAuthUrl } from "@/lib/integrations/meta-ads";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";

// GET /api/integrations/meta-ads/oauth — kicks off the Meta OAuth dialog.
// Full-page redirect (not fetch) since OAuth requires a top-level navigation.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const state = encodeOAuthState({ organizationId: session.user.organizationId });
    return NextResponse.redirect(getMetaOAuthUrl(state));
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations/meta-ads/oauth failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
