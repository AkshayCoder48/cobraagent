import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromRequest } from "@/lib/db/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/agent/runs — list recent agent runs (admin only). */
export async function GET(request: NextRequest) {
  const result = await resolveUserFromRequest(request);
  if (!result || result.user.role !== "admin") {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const runs = await db.agentRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ runs });
}
