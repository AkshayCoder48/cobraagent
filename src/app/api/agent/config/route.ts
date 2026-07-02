import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserFromRequest } from "@/lib/db/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent/config — read the agent config (admin only).
 * API key is masked. Built by OnyxAi.
 */
export async function GET(request: NextRequest) {
  const result = await resolveUserFromRequest(request);
  if (!result || result.user.role !== "admin") {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const config = await db.agentConfig.findUnique({ where: { id: "singleton" } });
  if (!config) {
    return NextResponse.json({
      config: {
        baseUrl: "",
        apiKey: "",
        hasApiKey: false,
        model: "",
        prompt:
          "You are CobraAgent, a scheduled AI assistant built by OnyxAi. Be concise and structured.",
        webhookToken: "",
        hasWebhookToken: false,
        enabled: true,
      },
    });
  }
  return NextResponse.json({
    config: {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "",
      hasApiKey: Boolean(config.apiKey),
      model: config.model,
      prompt: config.prompt,
      webhookToken: config.webhookToken ? "••••••" : "",
      hasWebhookToken: Boolean(config.webhookToken),
      enabled: config.enabled,
    },
  });
}

/**
 * PUT /api/agent/config — update the agent config (admin only).
 * If apiKey/webhookToken are masked or empty, keep the existing values.
 * Built by OnyxAi.
 */
export async function PUT(request: NextRequest) {
  const result = await resolveUserFromRequest(request);
  if (!result || result.user.role !== "admin") {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { baseUrl, apiKey, model, prompt, webhookToken, enabled } = body;

  if (!baseUrl || !model) {
    return NextResponse.json({ detail: "baseUrl and model are required" }, { status: 400 });
  }

  const existing = await db.agentConfig.findUnique({ where: { id: "singleton" } });
  const finalApiKey = apiKey && !apiKey.startsWith("••••") ? apiKey : (existing?.apiKey ?? "");
  const finalWebhookToken =
    webhookToken && !webhookToken.startsWith("••••")
      ? webhookToken
      : (existing?.webhookToken ?? null);

  const config = await db.agentConfig.upsert({
    where: { id: "singleton" },
    update: {
      baseUrl,
      apiKey: finalApiKey,
      model,
      prompt: prompt || "",
      webhookToken: finalWebhookToken,
      enabled: enabled ?? true,
    },
    create: {
      id: "singleton",
      baseUrl,
      apiKey: finalApiKey,
      model,
      prompt: prompt || "",
      webhookToken: finalWebhookToken,
      enabled: enabled ?? true,
    },
  });

  return NextResponse.json({
    config: {
      baseUrl: config.baseUrl,
      apiKey: "••••••••" + config.apiKey.slice(-4),
      hasApiKey: Boolean(config.apiKey),
      model: config.model,
      prompt: config.prompt,
      webhookToken: config.webhookToken ? "••••••" : "",
      hasWebhookToken: Boolean(config.webhookToken),
      enabled: config.enabled,
    },
  });
}
