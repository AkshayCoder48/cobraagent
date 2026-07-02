"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { useAuth } from "@/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Switch } from "@/components/ui";
import { Loader2, Play, Save, Terminal, Download } from "lucide-react";
import { toast } from "sonner";

interface AgentConfigData {
  baseUrl: string;
  apiKey: string;
  hasApiKey: boolean;
  model: string;
  prompt: string;
  webhookToken: string;
  hasWebhookToken: boolean;
  enabled: boolean;
}

export default function AgentPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<AgentConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
      return;
    }
    fetch("/api/agent/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config);
          setBaseUrl(data.config.baseUrl);
          setModel(data.config.model);
          setPrompt(data.config.prompt);
          setEnabled(data.config.enabled);
        }
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/agent/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        apiKey: apiKey || undefined,
        model,
        prompt,
        webhookToken: webhookToken || undefined,
        enabled,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.detail || "Save failed");
      return;
    }
    const data = await res.json();
    setConfig(data.config);
    setApiKey("");
    setWebhookToken("");
    toast.success("Agent config saved");
  };

  const runNow = async () => {
    setRunning(true);
    toast.info("Running agent…");
    const res = await fetch("/api/agent/run", { method: "POST" });
    setRunning(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.detail || "Run failed");
    } else {
      toast.success("Agent run completed");
    }
  };

  const downloadConfig = () => {
    const fullConfig = {
      baseUrl,
      apiKey: "(saved-server-side)",
      model,
      prompt,
      webhookUrl: typeof window !== "undefined" ? `${window.location.origin}/api/agent/run` : "",
    };
    const blob = new Blob([JSON.stringify(fullConfig, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-config.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded agent-config.json — commit it to the repo for GitHub Actions");
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Terminal className="text-primary size-5" />
          <span className="font-semibold">CobraAgent · Agent Runner</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            Back to app
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Agent Runner</h1>
          <p className="text-muted-foreground text-sm">
            Configure the CobraAgent&apos;s AI provider. No GitHub secrets or env vars — the config
            is stored in the app database. Use GitHub Actions as a free runner (unlimited minutes
            for public repos).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Configuration</CardTitle>
            <CardDescription>
              Any OpenAI-compatible endpoint. The API key is stored server-side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apiKey">
                API Key{" "}
                {config?.hasApiKey && (
                  <span className="text-muted-foreground text-xs">
                    (saved — leave blank to keep)
                  </span>
                )}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.hasApiKey ? "••••••••...." : "sk-... or gsk_..."}
                className="font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model ID</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="llama-3.3-70b-versatile"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt">Agent Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhookToken">
                Webhook Token (optional){" "}
                {config?.hasWebhookToken && (
                  <span className="text-muted-foreground text-xs">(saved)</span>
                )}
              </Label>
              <Input
                id="webhookToken"
                type="password"
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder="Set a token to protect /api/agent/run from public access"
                className="font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="enabled" className="cursor-pointer">
                  Agent enabled
                </Label>
                <p className="text-muted-foreground text-xs">
                  When disabled, run requests are rejected.
                </p>
              </div>
              <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save config
            </Button>
            <Button onClick={runNow} disabled={running} variant="secondary">
              {running ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              Run now
            </Button>
            <Button onClick={downloadConfig} variant="outline">
              <Download className="mr-2 size-4" />
              Download agent-config.json
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">GitHub Actions (Free Runner)</CardTitle>
            <CardDescription>
              The repo includes <code>.github/workflows/agent-runner.yml</code> and{" "}
              <code>agent.py</code>. Commit
              <code> agent-config.json</code> (downloaded above) to the repo root, and the workflow
              will trigger this app on an hourly cron — no secrets needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-3 font-mono text-xs break-all">
              POST{" "}
              {typeof window !== "undefined"
                ? window.location.origin
                : "https://your-app.vercel.app"}
              /api/agent/run
              <br />
              <span className="text-muted-foreground">Header:</span> X-Agent-Token: &lt;your webhook
              token&gt;
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
