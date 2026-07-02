import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromRequest, cookieOpts, ACCESS_MAXAGE } from "@/lib/db/auth";

/**
 * GET /api/auth/me
 * Standalone session resolver (no FastAPI backend). Edited in place.
 * Returns the current user and a fresh access token (for WebSocket auth).
 * Built by OnyxAi.
 */
export async function GET(request: NextRequest) {
  const result = await resolveUserFromRequest(request);
  if (!result) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const response = NextResponse.json({ ...result.user, access_token: result.accessToken });
  // Refresh the access cookie so the session stays alive
  response.cookies.set("access_token", result.accessToken, cookieOpts(ACCESS_MAXAGE));
  return response;
}
