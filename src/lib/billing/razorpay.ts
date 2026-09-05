import Razorpay from "razorpay";
import crypto from "crypto";

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!client) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured");
    client = new Razorpay({ key_id, key_secret });
  }
  return client;
}

export async function createRazorpayCustomer(name: string, email: string) {
  return getRazorpayClient().customers.create({ name, email });
}

/** Creates a recurring subscription against a pre-created Razorpay Plan (see Plan.razorpayPlanId). */
export async function createRazorpaySubscription(razorpayPlanId: string, customerNotifyEmail: string, totalCount = 120) {
  return getRazorpayClient().subscriptions.create({
    plan_id: razorpayPlanId,
    customer_notify: 1,
    total_count: totalCount, // ~10 years of monthly billing; cancel anytime
    notes: { email: customerNotifyEmail },
  });
}

export async function cancelRazorpaySubscription(subscriptionId: string) {
  return getRazorpayClient().subscriptions.cancel(subscriptionId);
}

/** Verifies the X-Razorpay-Signature header on incoming billing webhooks. */
export function verifyRazorpayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signatureHeader || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

/** Verifies the signature returned to the browser after a successful Razorpay Checkout payment. */
export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected === signature;
}
