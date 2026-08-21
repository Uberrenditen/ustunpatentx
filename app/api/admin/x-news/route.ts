import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { previewQueue } from "@/lib/publish";
import {
  listTweets,
  loadConfig,
  revealedSecrets,
  saveConfig,
} from "@/lib/store";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const config = await loadConfig();
  const [posts, preview] = await Promise.all([listTweets(), previewQueue()]);
  return NextResponse.json({
    enabled: config.enabled !== false,
    storedEnabled: config.enabled !== false,
    postsPerRun: config.postsPerRun ?? 1,
    secrets: revealedSecrets(config),
    updatedAt: config.updatedAt ?? null,
    lastPublishAt: config.lastPublishAt ?? null,
    lastPublishOk: config.lastPublishOk ?? null,
    lastPublishSkipped: config.lastPublishSkipped ?? null,
    lastPublishReason: config.lastPublishReason ?? null,
    lastPublishErrorCode: config.lastPublishErrorCode ?? null,
    posts,
    preview,
  });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
  const postsPerRun =
    typeof body.postsPerRun === "number"
      ? body.postsPerRun
      : typeof body.postsPerRun === "string" && body.postsPerRun.trim()
        ? Number(body.postsPerRun)
        : undefined;

  const stored = await saveConfig({
    apiKey: str(body.apiKey),
    apiSecret: str(body.apiSecret),
    accessToken: str(body.accessToken),
    accessTokenSecret: str(body.accessTokenSecret),
    enabled,
    postsPerRun,
  });

  return NextResponse.json({
    ok: true,
    enabled: stored.enabled !== false,
    storedEnabled: stored.enabled !== false,
    postsPerRun: stored.postsPerRun ?? 1,
    secrets: revealedSecrets(stored),
    updatedAt: stored.updatedAt ?? null,
  });
}
