import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, toApiUser } from "@/lib/db/auth";

/**
 * POST /api/auth/register
 * Standalone registration (Prisma, no FastAPI backend). Edited in place
 * from the cloned template's backend-proxy version. Built by OnyxAi.
 * First registered user becomes admin automatically.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toString().toLowerCase().trim();
    const password = body.password?.toString();
    const fullName = body.full_name?.toString().trim() || null;

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { detail: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ detail: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    // First user becomes admin
    const userCount = await db.user.count();
    const role = userCount === 0 ? "admin" : "user";

    const user = await db.user.create({
      data: { email, fullName, passwordHash, role },
    });

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        user: toApiUser(user),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
