import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/encryption";
import { emitEvent } from "@/lib/webhooks";
import {
  fetchLeadsForForm,
  fetchCampaignInsights,
  flattenLeadFields,
  type MetaAdsCredentials,
} from "@/lib/integrations/meta-ads";
import { fetchGoogleAdsLeads, fetchGoogleAdsInsights, refreshGoogleAccessToken } from "@/lib/integrations/google-ads";
import { fetchRecentCustomers, fetchRecentOrders } from "@/lib/integrations/shopify";
import type { IntegrationType } from "@prisma/client";

/**
 * Runs per-organization sync for a given integration type. Triggered either
 * by an inbound webhook (real-time) or the periodic ads-sync queue (polling
 * fallback + historical insights backfill). Kept intentionally simple/flat —
 * this is the seam to extend if you need incremental cursors, pagination,
 * per-campaign field mapping, etc.
 */
export async function runAdsSyncForOrg(organizationId: string, type: IntegrationType) {
  const integration = await prisma.integration.findUnique({ where: { organizationId_type: { organizationId, type } } });
  if (!integration || integration.status !== "CONNECTED" || !integration.credentials) return;

  const creds = decryptJson<Record<string, any>>(integration.credentials);

  try {
    if (type === "META_ADS") await syncMetaAds(organizationId, creds as MetaAdsCredentials & { formIds?: string[] });
    if (type === "GOOGLE_ADS") await syncGoogleAds(organizationId, creds as { refreshToken: string; customerId: string });
    if (type === "SHOPIFY") await syncShopify(organizationId, creds as { shop: string; accessToken: string });

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date(), lastError: null },
    });
  } catch (err: any) {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "ERROR", lastError: String(err?.message ?? err) },
    });
    throw err;
  }
}

async function upsertLeadFromExternal(
  organizationId: string,
  source: "META_ADS" | "GOOGLE_ADS" | "SHOPIFY",
  sourceRef: string,
  fields: { name?: string; email?: string; phone?: string }
) {
  const existing = await prisma.lead.findFirst({ where: { organizationId, sourceRef } });
  if (existing) return existing;

  const lead = await prisma.lead.create({
    data: {
      organizationId,
      name: fields.name || "Unnamed lead",
      email: fields.email,
      phone: fields.phone,
      source,
      sourceRef,
      status: "NEW",
    },
  });
  await emitEvent(organizationId, "lead.created", { leadId: lead.id, source });
  return lead;
}

async function syncMetaAds(organizationId: string, creds: MetaAdsCredentials & { formIds?: string[] }) {
  for (const formId of creds.formIds ?? []) {
    const leads = await fetchLeadsForForm(formId, creds.accessToken);
    for (const raw of leads) {
      const fields = flattenLeadFields(raw.field_data);
      await upsertLeadFromExternal(organizationId, "META_ADS", raw.id, {
        name: fields.full_name ?? fields.name,
        email: fields.email,
        phone: fields.phone_number ?? fields.phone,
      });
    }
  }

  if (creds.adAccountId) {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const until = new Date().toISOString().slice(0, 10);
    const insights = await fetchCampaignInsights(creds.adAccountId, creds.accessToken, since, until);
    for (const row of insights) {
      const conversions = row.actions?.find((a) => a.action_type === "lead")?.value ?? "0";
      await prisma.adInsight.upsert({
        where: {
          organizationId_platform_campaignId_date: {
            organizationId,
            platform: "META_ADS",
            campaignId: row.campaign_id,
            date: new Date(row.date_start),
          },
        },
        update: {
          spendPaise: Math.round(parseFloat(row.spend) * 100),
          impressions: parseInt(row.impressions, 10),
          clicks: parseInt(row.clicks, 10),
          conversions: parseInt(conversions, 10),
        },
        create: {
          organizationId,
          platform: "META_ADS",
          campaignId: row.campaign_id,
          campaignName: row.campaign_name,
          date: new Date(row.date_start),
          spendPaise: Math.round(parseFloat(row.spend) * 100),
          impressions: parseInt(row.impressions, 10),
          clicks: parseInt(row.clicks, 10),
          conversions: parseInt(conversions, 10),
        },
      });
    }
  }
}

async function syncGoogleAds(organizationId: string, creds: { refreshToken: string; customerId: string }) {
  const { access_token } = await refreshGoogleAccessToken(creds.refreshToken);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const leads = await fetchGoogleAdsLeads(creds.customerId, access_token, since);
  for (const row of leads) {
    const data = row.leadFormSubmissionData;
    const fieldMap: Record<string, string> = {};
    for (const f of data?.leadFormSubmissionFields ?? []) fieldMap[f.fieldType] = f.fieldValue;
    await upsertLeadFromExternal(organizationId, "GOOGLE_ADS", `${data?.campaignId}-${data?.submissionDateTime}`, {
      name: fieldMap.FULL_NAME,
      email: fieldMap.EMAIL,
      phone: fieldMap.PHONE_NUMBER,
    });
  }

  const until = new Date().toISOString().slice(0, 10);
  const insights = await fetchGoogleAdsInsights(creds.customerId, access_token, since, until);
  for (const row of insights) {
    await prisma.adInsight.upsert({
      where: {
        organizationId_platform_campaignId_date: {
          organizationId,
          platform: "GOOGLE_ADS",
          campaignId: String(row.campaign.id),
          date: new Date(row.segments.date),
        },
      },
      update: {
        spendPaise: Math.round(row.metrics.costMicros / 10_000),
        impressions: Number(row.metrics.impressions ?? 0),
        clicks: Number(row.metrics.clicks ?? 0),
        conversions: Math.round(Number(row.metrics.conversions ?? 0)),
      },
      create: {
        organizationId,
        platform: "GOOGLE_ADS",
        campaignId: String(row.campaign.id),
        campaignName: row.campaign.name,
        date: new Date(row.segments.date),
        spendPaise: Math.round(row.metrics.costMicros / 10_000),
        impressions: Number(row.metrics.impressions ?? 0),
        clicks: Number(row.metrics.clicks ?? 0),
        conversions: Math.round(Number(row.metrics.conversions ?? 0)),
      },
    });
  }
}

async function syncShopify(organizationId: string, creds: { shop: string; accessToken: string }) {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const customers = await fetchRecentCustomers(creds.shop, creds.accessToken, since);
  for (const c of customers) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || `Customer ${c.id}`;
    await prisma.contact.upsert({
      where: { id: `shopify_${c.id}` }, // deterministic id keeps this idempotent across re-syncs
      update: {
        name,
        email: c.email,
        phone: c.phone,
        totalSpendPaise: Math.round(parseFloat(c.total_spent) * 100),
        ordersCount: c.orders_count,
      },
      create: {
        id: `shopify_${c.id}`,
        organizationId,
        name,
        email: c.email,
        phone: c.phone,
        source: "SHOPIFY",
        sourceRef: String(c.id),
        totalSpendPaise: Math.round(parseFloat(c.total_spent) * 100),
        ordersCount: c.orders_count,
      },
    });
  }

  const orders = await fetchRecentOrders(creds.shop, creds.accessToken, since);
  for (const o of orders) {
    if (!o.customer) continue;
    const name = [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || o.customer.email || o.name;
    await upsertLeadFromExternal(organizationId, "SHOPIFY", `shopify_order_${o.id}`, {
      name,
      email: o.customer.email ?? undefined,
    }).catch(() => null); // orders are informational; customer sync above is the primary path
  }
}
