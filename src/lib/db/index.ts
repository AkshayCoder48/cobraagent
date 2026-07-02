import { PrismaClient } from "@prisma/client";

/**
 * CobraAgent Prisma client — standalone SQLite database.
 * No FastAPI backend required. Built by OnyxAi.
 *
 * On Vercel's serverless runtime, the SQLite file lives in /tmp (the only
 * writable directory). Each cold start gets a fresh /tmp, so the DB is
 * ephemeral — but on platforms with persistent filesystems (Render, Railway,
 * Fly.io, self-hosted), it persists normally. For production use on Vercel,
 * switch DATABASE_URL to a real Postgres (Neon, Supabase) — the Prisma
 * schema is Postgres-compatible if you change the provider.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaMigrated: boolean | undefined;
};

async function ensureMigrated(client: PrismaClient) {
  if (globalForPrisma.prismaMigrated) return;
  globalForPrisma.prismaMigrated = true;
  try {
    // Probe — if the users table doesn't exist, this throws
    await client.user.count();
  } catch {
    // Table missing — create schema directly via raw SQL (SQLite)
    // This runs once per cold start when the DB is fresh.
    try {
      await client.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "fullName" TEXT,
          "passwordHash" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "role" TEXT NOT NULL DEFAULT 'user',
          "avatarUrl" TEXT,
          "onboardingCompletedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

        CREATE TABLE IF NOT EXISTS "AgentConfig" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "baseUrl" TEXT NOT NULL,
          "apiKey" TEXT NOT NULL,
          "model" TEXT NOT NULL,
          "prompt" TEXT NOT NULL,
          "webhookToken" TEXT,
          "enabled" BOOLEAN NOT NULL DEFAULT true,
          "updatedAt" DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "AgentRun" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "trigger" TEXT NOT NULL DEFAULT 'manual',
          "status" TEXT NOT NULL DEFAULT 'pending',
          "prompt" TEXT NOT NULL,
          "output" TEXT,
          "error" TEXT,
          "startedAt" DATETIME,
          "finishedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "AgentRun_status_idx" ON "AgentRun"("status");
      `);
    } catch {
      // If this fails (e.g. table already exists on a different driver), ignore
    }
  }
}

class CobraPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    // Fire-and-forget migration on creation
    void ensureMigrated(this);
  }
}

export const db = globalForPrisma.prisma ?? new CobraPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
