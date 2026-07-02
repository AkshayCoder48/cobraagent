import { PrismaClient } from "@prisma/client";

/**
 * CobraAgent Prisma client — standalone SQLite database.
 * No FastAPI backend required. Built by OnyxAi.
 *
 * Uses Prisma's $extends query middleware to auto-run the schema migration
 * before the first query of each cold start. This guarantees tables exist
 * even when /tmp is fresh (Vercel serverless ephemeral filesystem).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const MIGRATION_SQL = `
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
`;

let migrated = false;
async function ensureMigrated(): Promise<void> {
  if (migrated) return;
  // Use a raw client (not the extended one) to avoid recursion
  const raw = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });
  try {
    await raw.user.count();
    migrated = true;
  } catch {
    // Table missing — run migration. SQLite $executeRawUnsafe only runs one
    // statement at a time, so split by semicolon.
    const stmts = MIGRATION_SQL.split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of stmts) {
      try {
        await raw.$executeRawUnsafe(stmt);
      } catch {
        // Ignore "already exists" errors
      }
    }
    migrated = true;
  }
}

const baseClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = baseClient;

/**
 * Extended client: every query first awaits ensureMigrated(), then runs.
 * This is the official Prisma way to add pre-query logic.
 */
export const db = baseClient.$extends({
  query: {
    user: {
      async $allOperations({ operation, args, query }) {
        await ensureMigrated();
        return query(args);
      },
    },
    agentConfig: {
      async $allOperations({ args, query }) {
        await ensureMigrated();
        return query(args);
      },
    },
    agentRun: {
      async $allOperations({ args, query }) {
        await ensureMigrated();
        return query(args);
      },
    },
  },
});
