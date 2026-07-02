import { NextResponse } from "next/server";

/**
 * POST /api/auth/password-reset/request
 * Standalone mode: password reset via email is not available (no SMTP configured).
 * Edited in place from the cloned template. Built by OnyxAi.
 */
export async function POST() {
  return NextResponse.json(
    {
      detail:
        "Password reset is not available in standalone mode. Contact your admin to reset your password directly in the database.",
    },
    { status: 501 },
  );
}
