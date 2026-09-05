import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { generateApiKey } from "@/lib/api-keys";

// GET /api/integrations/api-keys — list the org's API keys. Never returns keyHash.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const keys = await prisma.apiKey.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations/api-keys failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

// POST /api/integrations/api-keys — create a new key. The full key is
// returned ONLY in this response — only its hash + prefix are stored.
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

    const { fullKey, keyPrefix, keyHash } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        organizationId: session.user.organizationId,
        name: parsed.data.name,
        keyPrefix,
        keyHash,
      },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    });

    return NextResponse.json({ key: { ...key, fullKey } }, { status: 201 });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/api-keys failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
