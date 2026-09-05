import crypto from "crypto";

/**
 * OAuth `state` param helpers shared by every integrations/*\/oauth + callback
 * route pair. The callback for a third-party OAuth redirect (Meta, Google,
 * Shopify) is hit directly by that platform's server with no CRM session
 * cookie attached — so we can't rely on `getSession()` there. Instead we
 * round-trip the bits of context we need (organizationId, and provider-
 * specific extras like the Shopify shop domain or which Google flow this is)
 * base64url-encoded inside `state`, which every OAuth provider echoes back
 * verbatim on the callback.
 *
 * This is intentionally NOT signed/encrypted — `state` here carries no
 * secrets (no tokens), only routing info, and the OAuth `code` exchange still
 * requires our client secret, so a tampered state can at worst misattribute
 * which org a connection lands on for a request that already needed a valid
 * `code` from the provider.
 */
export function encodeOAuthState(data: Record<string, string>): string {
  const withNonce = { ...data, n: crypto.randomBytes(8).toString("hex") };
  return Buffer.from(JSON.stringify(withNonce)).toString("base64url");
}

export function decodeOAuthState<T extends Record<string, string>>(state: string): T {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as T;
}
