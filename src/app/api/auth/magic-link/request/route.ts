import { NextResponse } from "next/server";

/** Magic link auth is not available in standalone mode (no SMTP). */
export async function POST() {
  return NextResponse.json(
    { detail: "Magic link auth is not available in standalone mode." },
    { status: 501 },
  );
}
