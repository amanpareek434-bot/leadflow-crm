import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { getGoogleOAuthUrl, GOOGLE_SHEETS_SCOPES } from "@/lib/integrations/google-ads";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";

// GET /api/integrations/google-sheets/oauth — kicks off the Google consent
// screen for Sheets scopes. See google-ads/callback/route.ts for why the
// callback that actually fires is usually google-ads/callback, not
// google-sheets/callback — `purpose` in state routes it correctly either way.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const state = encodeOAuthState({ organizationId: session.user.organizationId, purpose: "GOOGLE_SHEETS" });
    return NextResponse.redirect(getGoogleOAuthUrl(state, GOOGLE_SHEETS_SCOPES));
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations/google-sheets/oauth failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
