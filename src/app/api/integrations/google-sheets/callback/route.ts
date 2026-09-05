import { NextResponse } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/integrations/google-oauth-callback";

// GET /api/integrations/google-sheets/callback
// Only reached if GOOGLE_REDIRECT_URI is configured to point here (e.g. a
// second OAuth client dedicated to Sheets). Otherwise Google calls back to
// google-ads/callback for both flows — see the note there. Delegates to the
// same shared handler either way, keyed off `purpose` in `state`.
export async function GET(req: Request) {
  try {
    const { type } = await handleGoogleOAuthCallback(req);
    const q = type === "GOOGLE_SHEETS" ? "connected=google_sheets" : "connected=google_ads";
    return NextResponse.redirect(new URL(`/integrations?${q}`, req.url));
  } catch (err) {
    console.error("GET /api/integrations/google-sheets/callback failed", err);
    return NextResponse.redirect(new URL("/integrations?error=google", req.url));
  }
}
