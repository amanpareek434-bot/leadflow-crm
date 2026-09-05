/**
 * Google Ads API — OAuth + lead-form-lead sync + campaign performance.
 * Docs: https://developers.google.com/google-ads/api/docs/start
 *
 * Requires a Developer Token (GOOGLE_ADS_DEVELOPER_TOKEN) approved by Google
 * for production use — in test mode it only works against test accounts.
 * We call the REST interface directly (searchStream) to avoid pulling in the
 * heavy gRPC client library.
 */

const API_VERSION = "v17";

export function getGoogleOAuthUrl(state: string, scopes: string[]) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: scopes.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export const GOOGLE_ADS_SCOPES = ["https://www.googleapis.com/auth/adwords"];
export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description ?? "Google OAuth exchange failed");
  return json as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description ?? "Failed to refresh Google token");
  return json as { access_token: string; expires_in: number };
}

async function gAdsSearch(customerId: string, accessToken: string, query: string) {
  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
        "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.[0]?.error?.message ?? "Google Ads API query failed");
  return json as Array<{ results?: any[] }>;
}

/** Pull lead-form submissions (Google Ads "Lead Form" campaigns) since a given date. */
export async function fetchGoogleAdsLeads(customerId: string, accessToken: string, sinceDate: string) {
  const query = `
    SELECT lead_form_submission_data.campaign_id, lead_form_submission_data.submission_date_time,
           lead_form_submission_data.lead_form_submission_fields
    FROM lead_form_submission_data
    WHERE lead_form_submission_data.submission_date_time >= '${sinceDate}'`;
  const chunks = await gAdsSearch(customerId, accessToken, query);
  return chunks.flatMap((c) => c.results ?? []);
}

/** Daily campaign spend/clicks/conversions for the Reports > Ads dashboard. */
export async function fetchGoogleAdsInsights(customerId: string, accessToken: string, sinceDate: string, untilDate: string) {
  const query = `
    SELECT campaign.id, campaign.name, segments.date, metrics.cost_micros,
           metrics.impressions, metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${sinceDate}' AND '${untilDate}'`;
  const chunks = await gAdsSearch(customerId, accessToken, query);
  return chunks.flatMap((c) => c.results ?? []);
}
