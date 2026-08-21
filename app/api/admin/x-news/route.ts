import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PUBLISHER_CONFIG,
  loadPublisherConfig,
  savePublisherConfig,
} from "@/lib/publisher-config";
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
  const publisher = await loadPublisherConfig();
  const posts = (await listTweets()).filter((row) => row.status === "posted");
  return NextResponse.json({
    enabled: publisher.enabled && config.enabled !== false,
    storedEnabled: publisher.enabled,
    postsPerRun: publisher.postsPerRun,
    prompt: publisher.prompt,
    intervalMinutes: publisher.intervalMinutes,
    startHour: publisher.startHour,
    endHour: publisher.endHour,
    days: publisher.days,
    secrets: revealedSecrets(config),
    updatedAt: config.updatedAt ?? null,
    lastPublishAt: config.lastPublishAt ?? null,
    lastPublishOk: config.lastPublishOk ?? null,
    lastPublishSkipped: config.lastPublishSkipped ?? null,
    lastPublishReason: config.lastPublishReason ?? null,
    lastPublishErrorCode: config.lastPublishErrorCode ?? null,
    posts,
    preview: { tweets: [] },
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
  const intervalMinutes =
    typeof body.intervalMinutes === "number"
      ? body.intervalMinutes
      : typeof body.intervalMinutes === "string" && body.intervalMinutes.trim()
        ? Number(body.intervalMinutes)
        : undefined;
  const startHour =
    typeof body.startHour === "number"
      ? body.startHour
      : typeof body.startHour === "string" && body.startHour.trim()
        ? Number(body.startHour)
        : undefined;
  const endHour =
    typeof body.endHour === "number"
      ? body.endHour
      : typeof body.endHour === "string" && body.endHour.trim()
        ? Number(body.endHour)
        : undefined;
  const days = Array.isArray(body.days) ? body.days.map((d) => Number(d)) : undefined;
  const prompt = str(body.prompt);

  const current = await loadPublisherConfig();
  const publisher = await savePublisherConfig({
    ...DEFAULT_PUBLISHER_CONFIG,
    ...current,
    ...(enabled !== undefined ? { enabled } : {}),
    ...(postsPerRun !== undefined ? { postsPerRun } : {}),
    ...(intervalMinutes !== undefined ? { intervalMinutes } : {}),
    ...(startHour !== undefined ? { startHour } : {}),
    ...(endHour !== undefined ? { endHour } : {}),
    ...(days !== undefined ? { days } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
  });

  const stored = await saveConfig({
    apiKey: str(body.apiKey),
    apiSecret: str(body.apiSecret),
    accessToken: str(body.accessToken),
    accessTokenSecret: str(body.accessTokenSecret),
    openaiKey: str(body.openaiKey),
    enabled: publisher.enabled,
    postsPerRun: publisher.postsPerRun,
  });

  return NextResponse.json({
    ok: true,
    enabled: publisher.enabled,
    storedEnabled: publisher.enabled,
    postsPerRun: publisher.postsPerRun,
    prompt: publisher.prompt,
    intervalMinutes: publisher.intervalMinutes,
    startHour: publisher.startHour,
    endHour: publisher.endHour,
    days: publisher.days,
    secrets: revealedSecrets(stored),
    updatedAt: stored.updatedAt ?? null,
  });
}
