import { NextResponse } from "next/server";

/** OAuth is not available in standalone mode (no providers configured). */
export async function POST() {
  return NextResponse.json(
    { detail: "OAuth is not available in standalone mode. Use email/password." },
    { status: 501 },
  );
}
