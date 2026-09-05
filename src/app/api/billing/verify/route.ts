import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayPaymentSignature } from "@/lib/billing/razorpay";

const schema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// POST /api/billing/verify — called from the client after Razorpay Checkout's
// handler fires, for immediate UI feedback. The real source of truth for
// renewals/cancellations is the /api/webhooks/razorpay route.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = parsed.data;

    // Razorpay's subscription-checkout signature is HMAC(payment_id|subscription_id),
    // the same shape as the order-based helper — pass the subscription id in
    // place of "orderId".
    const valid = verifyRazorpayPaymentSignature(razorpay_subscription_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const organizationId = session.user.organizationId;
    const existing = await prisma.subscription.findUnique({ where: { organizationId } });
    if (!existing || existing.razorpaySubscriptionId !== razorpay_subscription_id) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await prisma.subscription.update({
      where: { organizationId },
      data: {
        status: "ACTIVE",
        // Placeholder — the webhook updates this to the real Razorpay value.
        currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/billing/verify failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
