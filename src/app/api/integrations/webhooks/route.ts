import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";

const ALLOWED_EVENTS = [
  "lead.created",
  "lead.status_changed",
  "deal.won",
  "deal.lost",
  "whatsapp.message_status",
] as const;

// GET /api/integrations/webhooks — list the org's outgoing webhook subscriptions,
// each with its single most recent delivery attempt (status + response code).
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    // Never send the secret back down on list — it's shown once, at creation.
    const sanitized = subscriptions.map(({ secret: _secret, ...rest }) => rest);

    return NextResponse.json({ subscriptions: sanitized });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations/webhooks failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.enum(ALLOWED_EVENTS)).min(1, "Select at least one event"),
});

// POST /api/integrations/webhooks — register a new outgoing webhook. The
// generated `secret` is returned ONLY in this response, so the receiving end
// can verify the `X-CRM-Signature` header (HMAC-SHA256 of the raw JSON body).
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const secret = crypto.randomBytes(24).toString("hex");
    const subscription = await prisma.webhookSubscription.create({
      data: {
        organizationId: session.user.organizationId,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/webhooks failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
