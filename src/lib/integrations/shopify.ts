/**
 * Shopify Admin API — customers/orders sync into Contacts + Leads, and store
 * analytics. Uses a custom-app style OAuth flow (per-org shop connection).
 * Docs: https://shopify.dev/docs/apps/build/authentication-authorization
 */

const API_VERSION = "2024-07";

export function getShopifyInstallUrl(shop: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY ?? "",
    scope: process.env.SHOPIFY_SCOPES ?? "read_orders,read_customers",
    redirect_uri: `${process.env.SHOPIFY_APP_URL}/api/integrations/shopify/callback`,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeShopifyCode(shop: string, code: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors ?? "Shopify OAuth exchange failed");
  return json as { access_token: string; scope: string };
}

function adminUrl(shop: string, path: string) {
  return `https://${shop}/admin/api/${API_VERSION}/${path}`;
}

export async function fetchRecentCustomers(shop: string, accessToken: string, sinceIso?: string) {
  const params = new URLSearchParams({ limit: "250" });
  if (sinceIso) params.set("created_at_min", sinceIso);
  const res = await fetch(adminUrl(shop, `customers.json?${params.toString()}`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors ?? "Failed to fetch Shopify customers");
  return json.customers as Array<{
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    orders_count: number;
    total_spent: string;
    created_at: string;
  }>;
}

export async function fetchRecentOrders(shop: string, accessToken: string, sinceIso?: string) {
  const params = new URLSearchParams({ limit: "250", status: "any" });
  if (sinceIso) params.set("created_at_min", sinceIso);
  const res = await fetch(adminUrl(shop, `orders.json?${params.toString()}`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors ?? "Failed to fetch Shopify orders");
  return json.orders as Array<{
    id: number;
    name: string;
    total_price: string;
    created_at: string;
    customer: { id: number; first_name: string | null; last_name: string | null; email: string | null } | null;
  }>;
}

/** Verifies the X-Shopify-Hmac-Sha256 header on incoming order/customer webhooks. */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const crypto = require("crypto") as typeof import("crypto");
  const digest = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET ?? "").update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}
