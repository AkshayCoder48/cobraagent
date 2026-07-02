import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyToken,
  signAccessToken,
  signRefreshToken,
  cookieOpts,
  ACCESS_MAXAGE,
  REFRESH_MAXAGE,
} from "@/lib/db/auth";

/**
 * POST /api/auth/refresh
 * Standalone refresh (no FastAPI backend). Edited in place.
 * Body: { refresh_token } OR uses the refresh_token cookie if body is empty.
 * Built by OnyxAi.
 */
export async function POST(request: NextRequest) {
  let refreshToken: string | undefined;
  try {
    const body = await request.json();
    refreshToken = body?.refresh_token;
  } catch {
    // Body might be empty — fall back to cookie
  }
  refreshToken ??= request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  const payload = await verifyToken(refreshToken);
  if (!payload || payload.type !== "refresh") {
    return NextResponse.json({ detail: "Invalid refresh token" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    return NextResponse.json({ detail: "User not found or disabled" }, { status: 401 });
  }

  const newPayload = { sub: user.id, email: user.email, role: user.role };
  const access_token = await signAccessToken(newPayload);
  const newRefresh = await signRefreshToken(newPayload);

  const response = NextResponse.json({
    access_token,
    refresh_token: newRefresh,
    token_type: "bearer",
  });
  response.cookies.set("access_token", access_token, cookieOpts(ACCESS_MAXAGE));
  response.cookies.set("refresh_token", newRefresh, cookieOpts(REFRESH_MAXAGE));
  return response;
}
