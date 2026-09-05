import { google } from "googleapis";

/**
 * Outgoing push to Google Sheets — one of the three "outgoing API" mechanisms
 * (the others being generic webhooks and the /api/v1 REST API). Uses the same
 * Google OAuth app as Google Ads (see google-ads.ts) but with Sheets scopes.
 */

export function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

export async function appendRows(accessToken: string, spreadsheetId: string, range: string, rows: (string | number)[][]) {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

export async function ensureHeaderRow(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[]) {
  const sheets = getSheetsClient(accessToken);
  const existing = await sheets.spreadsheets.values
    .get({ spreadsheetId, range: `${sheetName}!1:1` })
    .catch(() => null);
  if (!existing?.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
}

/** Push a single lead as a new row — called from the automation pipeline when the Google Sheets integration is active. */
export async function pushLeadToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  lead: { name: string; email?: string | null; phone?: string | null; status: string; source: string; createdAt: Date }
) {
  await ensureHeaderRow(accessToken, spreadsheetId, sheetName, ["Name", "Email", "Phone", "Status", "Source", "Created At"]);
  await appendRows(accessToken, spreadsheetId, `${sheetName}!A:F`, [
    [lead.name, lead.email ?? "", lead.phone ?? "", lead.status, lead.source, lead.createdAt.toISOString()],
  ]);
}
