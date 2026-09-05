import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";

const patchSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  timezone: z.string().min(1).max(60).optional(),
});

// PATCH /api/organization — update org name/timezone (ADMIN/OWNER only).
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, timezone } = parsed.data;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (timezone !== undefined) data.timezone = timezone;

    const organization = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data,
    });

    return NextResponse.json({ organization });
  } catch (err) {
    console.error("PATCH /api/organization failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
