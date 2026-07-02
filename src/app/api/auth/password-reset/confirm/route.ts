import { NextResponse } from "next/server";

/** @see /api/auth/password-reset/request — not available in standalone mode. */
export async function POST() {
  return NextResponse.json(
    { detail: "Password reset is not available in standalone mode." },
    { status: 501 },
  );
}
