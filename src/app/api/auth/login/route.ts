import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  comparePassword,
  issueTokensForUser,
  toApiUser,
  cookieOpts,
  ACCESS_MAXAGE,
  REFRESH_MAXAGE,
} from "@/lib/db/auth";

/**
 * POST /api/auth/login
 * Standalone login (Prisma + JWT, no FastAPI backend). Edited in place
 * from the cloned template's backend-proxy version. Built by OnyxAi.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toString().toLowerCase().trim();
    const password = body.password?.toString();

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ detail: "Account is disabled" }, { status: 403 });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });
    }

    const { access_token, refresh_token } = await issueTokensForUser(user);

    const response = NextResponse.json({
      user: toApiUser(user),
      access_token,
      refresh_token,
      token_type: "bearer",
      message: "Login successful",
    });

    response.cookies.set("access_token", access_token, cookieOpts(ACCESS_MAXAGE));
    response.cookies.set("refresh_token", refresh_token, cookieOpts(REFRESH_MAXAGE));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
