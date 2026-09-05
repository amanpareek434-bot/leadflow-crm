/**
 * Meta Marketing API — Lead Ads import + campaign insights.
 * Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads
 *
 * Flow:
 *  1. Org owner clicks "Connect" -> OAuth dialog (see app/api/integrations/meta-ads/oauth)
 *  2. We store the long-lived user access token (encrypted) on Integration.credentials
 *  3. Meta pushes new leads to our webhook (app/api/webhooks/meta-leadgen) in real time
 *  4. A scheduled job (ads-sync queue) pulls campaign insights into AdInsight for the dashboard
 */

const GRAPH_VERSION = "v20.0";
const apiUrl = (path: string) => `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;

export type MetaAdsCredentials = {
  accessToken: string; // long-lived user or system-user token
  adAccountId: string; // act_xxxxxxxx
};

export function getMetaOAuthUrl(state: string) {
  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/integrations/meta-ads/callback`;
  const scope = ["ads_management", "leads_retrieval", "pages_show_list", "pages_manage_ads"].join(",");
  const params = new URLSearchParams({
    client_id: appId ?? "",
    redirect_uri: redirectUri,
    scope,
    state,
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaCode(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    redirect_uri: `${process.env.APP_URL}/api/integrations/meta-ads/callback`,
    code,
  });
  const res = await fetch(apiUrl(`oauth/access_token?${params.toString()}`));
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Meta OAuth exchange failed");
  return json as { access_token: string; token_type: string; expires_in: number };
}

/** Pull leads submitted against a specific Lead Ads form since a given time. */
export async function fetchLeadsForForm(formId: string, accessToken: string, sinceIso?: string) {
  const params = new URLSearchParams({ access_token: accessToken, fields: "id,created_time,field_data" });
  if (sinceIso) params.set("filtering", JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceIso }]));
  const res = await fetch(apiUrl(`${formId}/leads?${params.toString()}`));
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to fetch Meta leads");
  return json.data as Array<{ id: string; created_time: string; field_data: { name: string; values: string[] }[] }>;
}

/** Daily campaign-level spend/clicks/conversions for the Reports > Ads dashboard. */
export async function fetchCampaignInsights(adAccountId: string, accessToken: string, sinceIso: string, untilIso: string) {
  const params = new URLSearchParams({
    access_token: accessToken,
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
    time_range: JSON.stringify({ since: sinceIso, until: untilIso }),
    time_increment: "1",
  });
  const res = await fetch(apiUrl(`${adAccountId}/insights?${params.toString()}`));
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to fetch Meta Ads insights");
  return json.data as Array<{
    date_start: string;
    campaign_id: string;
    campaign_name: string;
    spend: string;
    impressions: string;
    clicks: string;
    actions?: { action_type: string; value: string }[];
  }>;
}

/** Maps a Lead Ads field_data array into a flat { field_name: value } object. */
export function flattenLeadFields(fieldData: { name: string; values: string[] }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fieldData) out[f.name] = f.values?.[0] ?? "";
  return out;
}
