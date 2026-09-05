import { prisma } from "@/lib/prisma";
import { encryptJson, decryptJson } from "@/lib/encryption";
import { exchangeGoogleCode } from "@/lib/integrations/google-ads";
import { decodeOAuthState } from "@/lib/integrations/oauth-state";

/**
 * Shared logic for both the Google Ads and Google Sheets OAuth callbacks.
 *
 * IMPORTANT DEPLOYMENT NOTE: `getGoogleOAuthUrl()` (src/lib/integrations/google-ads.ts,
 * already built — not modified here) always builds the authorize request's
 * `redirect_uri` from the single `GOOGLE_REDIRECT_URI` env var, regardless of
 * which flow (Ads scopes vs Sheets scopes) kicked it off. .env.example points
 * that var at `/api/integrations/google-ads/callback`. That means in a normal
 * deployment Google will call back to THAT one URL for both flows — the
 * `/api/integrations/google-sheets/callback` route below only fires if you
 * additionally configure a second OAuth client with its own redirect URI
 * dedicated to Sheets.
 *
 * To make both flows work correctly with the single shared redirect URI out
 * of the box, we encode which flow this is (`purpose`) into the OAuth
 * `state` param ourselves (see oauth-state.ts) and branch on it here — so
 * whichever physical route Google actually hits, the right Integration row
 * gets updated.
 */
export type GoogleOAuthPurpose = "GOOGLE_ADS" | "GOOGLE_SHEETS";
type GoogleOAuthState = { organizationId: string; purpose: GoogleOAuthPurpose };

export async function handleGoogleOAuthCallback(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  if (oauthError) throw new Error(`Google denied the request: ${oauthError}`);
  if (!code || !state) throw new Error("Missing code or state");

  const decoded = decodeOAuthState<GoogleOAuthState>(state);
  if (!decoded.organizationId || !decoded.purpose) throw new Error("Invalid state");
  const { organizationId, purpose } = decoded;

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "";
  const result = await exchangeGoogleCode(code, redirectUri);

  const type = purpose === "GOOGLE_SHEETS" ? "GOOGLE_SHEETS" : "GOOGLE_ADS";

  const existing = await prisma.integration.findUnique({
    where: { organizationId_type: { organizationId, type } },
  });
  const priorCreds = existing?.credentials ? decryptJson<Record<string, any>>(existing.credentials) : {};

  // Google only returns a refresh_token on the FIRST consent (unless
  // prompt=consent forces a fresh one, which getGoogleOAuthUrl already sets —
  // but fall back to whatever we had stored just in case of a re-auth blip).
  const refreshToken = result.refresh_token ?? priorCreds.refreshToken ?? "";

  const credentials =
    type === "GOOGLE_SHEETS"
      ? encryptJson({
          refreshToken,
          spreadsheetId: priorCreds.spreadsheetId ?? "",
          sheetName: priorCreds.sheetName ?? "Leads",
        })
      : encryptJson({
          refreshToken,
          customerId: priorCreds.customerId ?? "",
        });

  await prisma.integration.upsert({
    where: { organizationId_type: { organizationId, type } },
    update: { status: "CONNECTED", credentials, lastError: null },
    create: { organizationId, type, status: "CONNECTED", credentials },
  });

  return { organizationId, type };
}
