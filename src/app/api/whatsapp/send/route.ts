import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertUnderWhatsappLimit } from "@/lib/limits";
import { whatsappQueue } from "@/lib/queue/queues";

// POST /api/whatsapp/send — send a free-text message OR a template message to
// a lead's WhatsApp number. Used by the inbox "send message" form and by any
// manual one-off template send. The actual API call + WhatsAppMessageLog row
// + usage increment happen in the background worker when the job is picked up.
const sendSchema = z
  .object({
    leadId: z.string().min(1, "leadId is required"),
    bodyText: z.string().min(1).max(4096).optional(),
    templateId: z.string().min(1).optional(),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .refine((v) => !!v.bodyText || !!v.templateId, {
    message: "Either bodyText or templateId is required",
  });

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { leadId, bodyText, templateId, variables } = parsed.data;
    const organizationId = session.user.organizationId;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (!lead.phone) {
      return NextResponse.json({ error: "This lead has no phone number on file" }, { status: 400 });
    }

    if (templateId) {
      const template = await prisma.whatsAppTemplate.findFirst({ where: { id: templateId, organizationId } });
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 400 });
      }
    }

    try {
      await assertUnderWhatsappLimit(organizationId);
    } catch (err: any) {
      if (err?.name === "PlanLimitError") {
        return NextResponse.json({ error: err.message }, { status: 402 });
      }
      throw err;
    }

    await whatsappQueue().add(
      "send",
      {
        organizationId,
        leadId,
        toPhone: lead.phone,
        templateId,
        bodyText,
        variables,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 10000 } }
    );

    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (err) {
    console.error("POST /api/whatsapp/send failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
