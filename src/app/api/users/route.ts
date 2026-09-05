import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { assertUnderUserLimit } from "@/lib/limits";

// GET /api/users — list the caller's org team members.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/users failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  email: z.string().email("Invalid email"),
  role: z.enum(["OWNER", "ADMIN", "AGENT"]).default("AGENT"),
});

// POST /api/users — "Add team member": creates a User directly with a
// generated temporary password (no email-sending service configured), the
// admin hands the credentials off out-of-band. Returned once in the response.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageUsers(session.user.role)) {
      throw new ForbiddenError("You don't have permission to manage team members");
    }

    const organizationId = session.user.organizationId;
    await assertUnderUserLimit(organizationId);

    const body = await req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, email, role } = parsed.data;

    if (role === "OWNER" && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can create another owner" }, { status: 403 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const temporaryPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: { organizationId, name, email: normalizedEmail, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ user, temporaryPassword }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "PlanLimitError") {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/users failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
