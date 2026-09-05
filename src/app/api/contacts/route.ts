import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/contacts — list the org's contacts (populated by the Shopify integration).
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contacts = await prisma.contact.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ contacts, total: contacts.length });
  } catch (err) {
    console.error("GET /api/contacts failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
