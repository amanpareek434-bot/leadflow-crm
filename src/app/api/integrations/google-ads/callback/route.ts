import { NextResponse } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/integrations/google-oauth-callback";

// GET /api/integrations/google-ads/callback
//
// NOTE: GOOGLE_REDIRECT_URI (see .env.example) is a single fixed URL used by
// getGoogleOAuthUrl() (already built, src/lib/integrations/google-ads.ts) for
// BOTH the Google Ads and Google Sheets OAuth flows — and .env.example points
// it at this exact route. So in a normal deployment THIS route is the one
// Google actually calls back to for both flows; we branch on `purpose`
// (encoded into `state` by the two /oauth routes) inside the shared
// handleGoogleOAuthCallback() helper to update the right Integration row
// either way. google-sheets/callback/route.ts exists too, for the alternate
// setup where you register a second OAuth client with its own redirect URI.
export async function GET(req: Request) {
  try {
    const { type } = await handleGoogleOAuthCallback(req);
    const q = type === "GOOGLE_SHEETS" ? "connected=google_sheets" : "connected=google_ads";
    return NextResponse.redirect(new URL(`/integrations?${q}`, req.url));
  } catch (err) {
    console.error("GET /api/integrations/google-ads/callback failed", err);
    return NextResponse.redirect(new URL("/integrations?error=google", req.url));
  }
}
