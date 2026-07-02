import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromRequest } from "@/lib/db/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/run
 * Runs the CobraAgent using the stored AgentConfig.
 *
 * Auth:
 *   - Admin session cookie → trigger = "manual"
 *   - X-Agent-Token header matching webhookToken → trigger = "webhook"
 *   - Otherwise 403
 *
 * No GitHub secrets needed — the provider config lives in the app's DB.
 * Built by OnyxAi.
 */
export async function POST(request: NextRequest) {
  const session = await resolveUserFromRequest(request);
  const isAdmin = session && session.user.role === "admin";

  const headerToken = request.headers.get("x-agent-token");
  const overridePrompt = request.headers.get("x-agent-prompt");

  const config = await db.agentConfig.findUnique({ where: { id: "singleton" } });
  if (!config || !config.enabled) {
    return NextResponse.json({ detail: "Agent is not configured or disabled" }, { status: 400 });
  }
  if (!config.baseUrl || !config.model) {
    return NextResponse.json(
      { detail: "Agent config is incomplete (baseUrl and model required)" },
      { status: 400 },
    );
  }

  let trigger = "manual";
  if (!isAdmin) {
    if (!config.webhookToken || headerToken !== config.webhookToken) {
      return NextResponse.json(
        { detail: "Forbidden — provide X-Agent-Token or sign in as admin" },
        { status: 403 },
      );
    }
    trigger = "webhook";
  }

  const prompt = overridePrompt || config.prompt || "You are CobraAgent. Be concise.";

  const run = await db.agentRun.create({
    data: {
      trigger,
      status: "running",
      prompt,
      startedAt: new Date(),
    },
  });

  try {
    const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You are CobraAgent, built by OnyxAi. Be concise and structured.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      }),
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Provider returned ${resp.status}: ${text.slice(0, 500)}`);
    }

    const data = await resp.json();
    const output = data?.choices?.[0]?.message?.content ?? "";

    const updated = await db.agentRun.update({
      where: { id: run.id },
      data: { status: "success", output, finishedAt: new Date() },
    });

    return NextResponse.json({ run: updated });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const updated = await db.agentRun.update({
      where: { id: run.id },
      data: { status: "failed", error, finishedAt: new Date() },
    });
    return NextResponse.json({ run: updated, error }, { status: 500 });
  }
}
