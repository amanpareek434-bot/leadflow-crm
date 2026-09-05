import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/billing/razorpay";

// This route is called directly by Razorpay's servers — there is NO user
// session here. Authenticity is verified via the X-Razorpay-Signature HMAC
// header (see verifyRazorpayWebhookSignature), not via getSession().

// POST /api/webhooks/razorpay — subscription lifecycle events.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const valid = verifyRazorpayWebhookSignature(rawBody, req.headers.get("x-razorpay-signature"));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const body = JSON.parse(rawBody);
    const event: string = body?.event ?? "";
    const entity = body?.payload?.subscription?.entity;
    const razorpaySubscriptionId: string | undefined = entity?.id;

    if (!razorpaySubscriptionId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const subscription = await prisma.subscription.findFirst({ where: { razorpaySubscriptionId } });
    if (!subscription) {
      console.warn(`razorpay webhook: no Subscription found for razorpaySubscriptionId=${razorpaySubscriptionId}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const currentPeriodEnd = entity?.current_end ? new Date(entity.current_end * 1000) : undefined;

    switch (event) {
      case "subscription.activated":
      case "subscription.charged":
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          },
        });
        break;
      case "subscription.cancelled":
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        });
        break;
      case "subscription.completed":
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "EXPIRED",
            ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          },
        });
        break;
      default:
        if (currentPeriodEnd) {
          await prisma.subscription.update({ where: { id: subscription.id }, data: { currentPeriodEnd } });
        }
        break;
    }
  } catch (err) {
    // Razorpay retries aggressively on non-200s — log and always ack.
    console.error("razorpay webhook processing failed", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
