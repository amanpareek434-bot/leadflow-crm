import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling, ForbiddenError } from "@/lib/rbac";
import { createRazorpayCustomer, createRazorpaySubscription } from "@/lib/billing/razorpay";

const schema = z.object({ planId: z.string().min(1) });

// POST /api/billing/checkout — starts a Razorpay recurring-subscription
// checkout for the selected plan. Requires RAZORPAY_KEY_ID/KEY_SECRET and the
// target Plan.razorpayPlanId to be configured (created in Razorpay dashboard).
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageBilling(session.user.role)) {
      throw new ForbiddenError("You don't have permission to manage billing");
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { planId } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (!plan.razorpayPlanId) {
      return NextResponse.json({ error: "Billing not configured for this plan" }, { status: 400 });
    }

    const organizationId = session.user.organizationId;
    const userEmail = session.user.email ?? "";
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    let existingSub = await prisma.subscription.findUnique({ where: { organizationId } });

    let razorpayCustomerId = existingSub?.razorpayCustomerId ?? null;
    if (!razorpayCustomerId) {
      const customer = await createRazorpayCustomer(org?.name ?? session.user.organizationName, userEmail);
      razorpayCustomerId = customer.id;
    }

    const rpSubscription = await createRazorpaySubscription(plan.razorpayPlanId, userEmail);

    const subscription = await prisma.subscription.upsert({
      where: { organizationId },
      update: {
        planId: plan.id,
        razorpayCustomerId,
        razorpaySubscriptionId: rpSubscription.id,
      },
      create: {
        organizationId,
        planId: plan.id,
        status: "TRIALING",
        razorpayCustomerId,
        razorpaySubscriptionId: rpSubscription.id,
      },
    });

    return NextResponse.json({
      subscriptionId: rpSubscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/billing/checkout failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
