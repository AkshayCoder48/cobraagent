import { SignJWT, jwtVerify } from "jose";

/**
 * CobraAgent JWT helpers — standalone, no FastAPI backend.
 * Uses `jose` (Web Crypto API, works on Vercel Edge/Node).
 * Built by OnyxAi.
 */

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "cobraagent-dev-secret-change-me",
);
const ISSUER = "cobraagent";
const ACCESS_TTL = 60 * 15; // 15 min
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days

export interface CobraJwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  type: "access" | "refresh";
}

export async function signAccessToken(payload: Omit<CobraJwtPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(SECRET);
}

export async function signRefreshToken(payload: Omit<CobraJwtPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${REFRESH_TTL}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<CobraJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: ISSUER });
    return payload as unknown as CobraJwtPayload;
  } catch {
    return null;
  }
}

export const ACCESS_MAXAGE = ACCESS_TTL;
export const REFRESH_MAXAGE = REFRESH_TTL;
