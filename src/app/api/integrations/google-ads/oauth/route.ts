import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { getGoogleOAuthUrl, GOOGLE_ADS_SCOPES } from "@/lib/integrations/google-ads";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";

// GET /api/integrations/google-ads/oauth — kicks off the Google consent screen
// for Ads scopes. `purpose` in state lets the (shared) callback tell this
// apart from a Google Sheets connection — see google-oauth-callback.ts.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const state = encodeOAuthState({ organizationId: session.user.organizationId, purpose: "GOOGLE_ADS" });
    return NextResponse.redirect(getGoogleOAuthUrl(state, GOOGLE_ADS_SCOPES));
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations/google-ads/oauth failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
