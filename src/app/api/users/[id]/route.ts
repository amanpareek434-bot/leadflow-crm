import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";

const patchSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/users/[id] — change a team member's role and/or active state.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageUsers(session.user.role)) {
      throw new ForbiddenError("You don't have permission to manage team members");
    }

    const organizationId = session.user.organizationId;
    const target = await prisma.user.findFirst({ where: { id: params.id, organizationId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { role, isActive } = parsed.data;

    // Only an OWNER may edit another OWNER (change their role or deactivate them).
    if (target.role === "OWNER" && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can modify another owner" }, { status: 403 });
    }
    // Only an OWNER may promote someone to OWNER.
    if (role === "OWNER" && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can grant the owner role" }, { status: 403 });
    }

    // Prevent removing the last active owner (via demotion or deactivation).
    const demotingOwner = target.role === "OWNER" && role !== undefined && role !== "OWNER";
    const deactivatingOwner = target.role === "OWNER" && isActive === false;
    if (demotingOwner || deactivatingOwner) {
      const activeOwners = await prisma.user.count({
        where: { organizationId, role: "OWNER", isActive: true },
      });
      if (activeOwners <= 1) {
        return NextResponse.json({ error: "Cannot remove the last active owner" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: target.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("PATCH /api/users/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
