import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple health check for Railway's deploy health checks / uptime monitors.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 503 });
  }
}
