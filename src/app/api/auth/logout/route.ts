import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Standalone logout — just clears cookies. Edited in place.
 * Built by OnyxAi.
 */
export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
