import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  ACCESS_MAXAGE,
  REFRESH_MAXAGE,
  type CobraJwtPayload,
} from "./jwt";
import type { User } from "@/types";

/**
 * CobraAgent standalone auth helpers — no FastAPI backend required.
 * Built by OnyxAi.
 */

export const cookieOpts = (maxAge: number) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  }) as const;

/** Shape the Prisma user into the API `User` type the frontend expects. */
export function toApiUser(u: {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  role: string;
  avatarUrl: string | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
}): User {
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    is_active: u.isActive,
    role: u.role,
    avatar_url: u.avatarUrl,
    onboarding_completed_at: u.onboardingCompletedAt?.toISOString() ?? null,
    created_at: u.createdAt.toISOString(),
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function issueTokensForUser(user: {
  id: string;
  email: string;
  role: string;
}): Promise<{ access_token: string; refresh_token: string }> {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const [access_token, refresh_token] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload),
  ]);
  return { access_token, refresh_token };
}

/** Resolve the current user from the access cookie, falling back to refresh. */
export async function resolveUserFromRequest(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<{ user: User; accessToken: string } | null> {
  const access = req.cookies.get("access_token")?.value;
  if (access) {
    const payload = await verifyToken(access);
    if (payload?.type === "access") {
      const u = await db.user.findUnique({ where: { id: payload.sub } });
      if (u && u.isActive) {
        return { user: toApiUser(u), accessToken: access };
      }
    }
  }

  const refresh = req.cookies.get("refresh_token")?.value;
  if (!refresh) return null;

  const payload = await verifyToken(refresh);
  if (payload?.type !== "refresh") return null;

  const u = await db.user.findUnique({ where: { id: payload.sub } });
  if (!u || !u.isActive) return null;

  // Issue a fresh access token
  const newAccess = await signAccessToken({ sub: u.id, email: u.email, role: u.role });
  return { user: toApiUser(u), accessToken: newAccess };
}

export { ACCESS_MAXAGE, REFRESH_MAXAGE, verifyToken, signAccessToken, signRefreshToken };
export type { CobraJwtPayload };
