import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations } from "@/lib/rbac";
import { decryptJson } from "@/lib/encryption";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { SyncDisconnectButtons } from "./sync-disconnect-buttons";
import { ShopifyConnectForm } from "./shopify-connect-form";
import { MetaSettingsForm } from "./meta-settings-form";
import { GoogleAdsSettingsForm } from "./google-ads-settings-form";
import { GoogleSheetsSettingsForm } from "./google-sheets-settings-form";
import type { Integration, IntegrationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, "success" | "destructive" | "secondary"> = {
  CONNECTED: "success",
  ERROR: "destructive",
  NOT_CONNECTED: "secondary",
};

function safeDecrypt<T extends Record<string, any>>(integration: Integration | undefined): T | null {
  if (!integration?.credentials) return null;
  try {
    return decryptJson<T>(integration.credentials);
  } catch (err) {
    console.error(`Failed to decrypt credentials for integration ${integration.id}`, err);
    return null;
  }
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const canManage = canManageIntegrations(session!.user.role);

  const integrations = await prisma.integration.findMany({ where: { organizationId } });
  const byType = new Map<IntegrationType, Integration>(integrations.map((i) => [i.type, i]));

  const meta = byType.get("META_ADS");
  const googleAds = byType.get("GOOGLE_ADS");
  const googleSheets = byType.get("GOOGLE_SHEETS");
  const shopify = byType.get("SHOPIFY");

  const metaCreds = safeDecrypt<{ adAccountId?: string; formIds?: string[] }>(meta);
  const googleAdsCreds = safeDecrypt<{ customerId?: string }>(googleAds);
  const googleSheetsCreds = safeDecrypt<{ spreadsheetId?: string; sheetName?: string }>(googleSheets);

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect ad platforms, Shopify, and Google Sheets to sync leads and campaign data automatically."
        actions={
          <div className="flex gap-2">
            <Link href="/integrations/webhooks">
              <Button variant="outline" size="sm">
                Webhooks
              </Button>
            </Link>
            <Link href="/integrations/api-keys">
              <Button variant="outline" size="sm">
                API Keys
              </Button>
            </Link>
          </div>
        }
      />

      {!canManage && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Only Owners and Admins can connect or manage integrations. You can view status below.
        </div>
      )}
      {searchParams.connected && (
        <div className="mb-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
          Connected successfully.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Something went wrong connecting that integration. Please try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Meta Ads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Meta Ads</CardTitle>
              <Badge variant={STATUS_BADGE[meta?.status ?? "NOT_CONNECTED"]}>{meta?.status ?? "NOT_CONNECTED"}</Badge>
            </div>
            <CardDescription>Sync Lead Ads submissions and campaign spend/impressions/clicks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Last synced: {meta?.lastSyncedAt ? formatDate(meta.lastSyncedAt) : "Never"}
            </p>
            {meta?.lastError && <p className="text-xs text-destructive">Error: {meta.lastError}</p>}

            {meta?.status === "CONNECTED" ? (
              <>
                <SyncDisconnectButtons type="META_ADS" label="Meta Ads" />
                {canManage && (
                  <MetaSettingsForm adAccountId={metaCreds?.adAccountId ?? ""} formIds={metaCreds?.formIds ?? []} />
                )}
              </>
            ) : canManage ? (
              <a href="/api/integrations/meta-ads/oauth">
                <Button size="sm">Connect</Button>
              </a>
            ) : null}
          </CardContent>
        </Card>

        {/* Google Ads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Google Ads</CardTitle>
              <Badge variant={STATUS_BADGE[googleAds?.status ?? "NOT_CONNECTED"]}>
                {googleAds?.status ?? "NOT_CONNECTED"}
              </Badge>
            </div>
            <CardDescription>Sync Lead Form submissions and daily campaign performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Last synced: {googleAds?.lastSyncedAt ? formatDate(googleAds.lastSyncedAt) : "Never"}
            </p>
            {googleAds?.lastError && <p className="text-xs text-destructive">Error: {googleAds.lastError}</p>}

            {googleAds?.status === "CONNECTED" ? (
              <>
                <SyncDisconnectButtons type="GOOGLE_ADS" label="Google Ads" />
                {canManage && <GoogleAdsSettingsForm customerId={googleAdsCreds?.customerId ?? ""} />}
              </>
            ) : canManage ? (
              <a href="/api/integrations/google-ads/oauth">
                <Button size="sm">Connect</Button>
              </a>
            ) : null}
          </CardContent>
        </Card>

        {/* Shopify */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Shopify</CardTitle>
              <Badge variant={STATUS_BADGE[shopify?.status ?? "NOT_CONNECTED"]}>
                {shopify?.status ?? "NOT_CONNECTED"}
              </Badge>
            </div>
            <CardDescription>Sync customers and orders into Contacts and Leads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Last synced: {shopify?.lastSyncedAt ? formatDate(shopify.lastSyncedAt) : "Never"}
            </p>
            {shopify?.lastError && <p className="text-xs text-destructive">Error: {shopify.lastError}</p>}

            {shopify?.status === "CONNECTED" ? (
              <SyncDisconnectButtons type="SHOPIFY" label="Shopify" />
            ) : canManage ? (
              <ShopifyConnectForm />
            ) : null}
          </CardContent>
        </Card>

        {/* Google Sheets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Google Sheets</CardTitle>
              <Badge variant={STATUS_BADGE[googleSheets?.status ?? "NOT_CONNECTED"]}>
                {googleSheets?.status ?? "NOT_CONNECTED"}
              </Badge>
            </div>
            <CardDescription>Manually push your latest leads as rows into a spreadsheet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Last pushed: {googleSheets?.lastSyncedAt ? formatDate(googleSheets.lastSyncedAt) : "Never"}
            </p>
            {googleSheets?.lastError && <p className="text-xs text-destructive">Error: {googleSheets.lastError}</p>}

            {googleSheets?.status === "CONNECTED" ? (
              <>
                <SyncDisconnectButtons type="GOOGLE_SHEETS" label="Google Sheets" />
                {canManage && (
                  <GoogleSheetsSettingsForm
                    spreadsheetId={googleSheetsCreds?.spreadsheetId ?? ""}
                    sheetName={googleSheetsCreds?.sheetName ?? "Leads"}
                  />
                )}
              </>
            ) : canManage ? (
              <a href="/api/integrations/google-sheets/oauth">
                <Button size="sm">Connect</Button>
              </a>
            ) : null}
          </CardContent>
        </Card>

        {/* WhatsApp — informational only, configured via env vars by another module */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>WhatsApp</CardTitle>
              <Badge variant="secondary">Managed by admin</Badge>
            </div>
            <CardDescription>Official WhatsApp Cloud API, used for templates and automations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configured by your administrator via environment variables — there's no per-org connect flow for
              WhatsApp. See the WhatsApp section in the sidebar to manage templates and automations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
