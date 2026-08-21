import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { XApiConfig } from "./x-api";

export type SecretStatus = { set: boolean; last4: string | null; value: string };

export type StoredConfig = {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  openaiKey?: string;
  enabled?: boolean;
  postsPerRun?: number;
  updatedAt?: string;
  lastPublishAt?: string;
  lastPublishOk?: boolean;
  lastPublishSkipped?: boolean;
  lastPublishReason?: string | null;
  lastPublishErrorCode?: string | null;
};

export type QueueTweet = {
  id: string;
  dayKey: string;
  hour: number;
  ticker: string;
  text: string;
  posted: boolean;
  tweetId: string | null;
  postedAt: string | null;
  status: "queued" | "posted" | "skipped";
};

type StateFile = {
  config: StoredConfig;
  tweets: QueueTweet[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

function emptyState(): StateFile {
  return { config: { enabled: true, postsPerRun: 1 }, tweets: [] };
}

async function readState(): Promise<StateFile> {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StateFile;
    return {
      config: parsed.config ?? emptyState().config,
      tweets: Array.isArray(parsed.tweets) ? parsed.tweets : [],
    };
  } catch {
    return emptyState();
  }
}

async function writeState(state: StateFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function reveal(value: string | undefined): SecretStatus {
  const v = value?.trim() || "";
  if (!v) return { set: false, last4: null, value: "" };
  return { set: true, last4: v.slice(-4), value: v };
}

function pick(stored: string | undefined, envValue: string | undefined): string {
  return stored?.trim() || envValue?.trim() || "";
}

export async function loadConfig(): Promise<StoredConfig> {
  return (await readState()).config;
}

export async function saveConfig(patch: Partial<StoredConfig>): Promise<StoredConfig> {
  const state = await readState();
  const next: StoredConfig = { ...state.config, updatedAt: new Date().toISOString() };
  const apply = (key: keyof StoredConfig, value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    (next as Record<string, unknown>)[key] = trimmed;
  };
  apply("apiKey", patch.apiKey);
  apply("apiSecret", patch.apiSecret);
  apply("accessToken", patch.accessToken);
  apply("accessTokenSecret", patch.accessTokenSecret);
  apply("openaiKey", patch.openaiKey);
  if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
  if (typeof patch.postsPerRun === "number" && Number.isFinite(patch.postsPerRun)) {
    next.postsPerRun = Math.min(Math.max(Math.floor(patch.postsPerRun), 1), 5);
  }
  if (typeof patch.lastPublishAt === "string") next.lastPublishAt = patch.lastPublishAt;
  if (typeof patch.lastPublishOk === "boolean") next.lastPublishOk = patch.lastPublishOk;
  if (typeof patch.lastPublishSkipped === "boolean") next.lastPublishSkipped = patch.lastPublishSkipped;
  if ("lastPublishReason" in patch) next.lastPublishReason = patch.lastPublishReason ?? null;
  if ("lastPublishErrorCode" in patch) next.lastPublishErrorCode = patch.lastPublishErrorCode ?? null;
  state.config = next;
  await writeState(state);
  return next;
}

export async function resolveXApiConfig(): Promise<XApiConfig | null> {
  const stored = await loadConfig();
  const apiKey = pick(stored.apiKey, process.env.X_API_KEY);
  const apiSecret = pick(stored.apiSecret, process.env.X_API_SECRET);
  const accessToken = pick(stored.accessToken, process.env.X_ACCESS_TOKEN);
  const accessTokenSecret = pick(stored.accessTokenSecret, process.env.X_ACCESS_TOKEN_SECRET);
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return null;
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

export function revealedSecrets(stored: StoredConfig) {
  return {
    apiKey: reveal(stored.apiKey || process.env.X_API_KEY),
    apiSecret: reveal(stored.apiSecret || process.env.X_API_SECRET),
    accessToken: reveal(stored.accessToken || process.env.X_ACCESS_TOKEN),
    accessTokenSecret: reveal(stored.accessTokenSecret || process.env.X_ACCESS_TOKEN_SECRET),
    openaiKey: reveal(stored.openaiKey || process.env.OPENAI_API_KEY),
  };
}

export async function listTweets(): Promise<QueueTweet[]> {
  const { tweets } = await readState();
  return [...tweets].sort((a, b) => {
    const byDay = String(b.dayKey).localeCompare(String(a.dayKey));
    if (byDay) return byDay;
    return a.hour - b.hour;
  });
}

export async function replaceDayQueue(dayKey: string, tweets: QueueTweet[]): Promise<void> {
  const state = await readState();
  const kept = state.tweets.filter((row) => row.dayKey !== dayKey || row.status === "posted");
  const postedIds = new Set(kept.filter((row) => row.dayKey === dayKey).map((row) => row.id));
  state.tweets = [...kept, ...tweets.filter((row) => !postedIds.has(row.id))];
  await writeState(state);
}

export async function appendTweet(tweet: QueueTweet): Promise<void> {
  const state = await readState();
  state.tweets = [tweet, ...state.tweets].slice(0, 200);
  await writeState(state);
}

export async function markTweet(
  id: string,
  patch: Partial<Pick<QueueTweet, "posted" | "tweetId" | "postedAt" | "status">>,
): Promise<void> {
  const state = await readState();
  state.tweets = state.tweets.map((row) => (row.id === id ? { ...row, ...patch } : row));
  await writeState(state);
}

export async function recordPublishResult(result: {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  errorCode?: string;
}): Promise<void> {
  await saveConfig({
    lastPublishAt: new Date().toISOString(),
    lastPublishOk: result.ok,
    lastPublishSkipped: Boolean(result.skipped),
    lastPublishReason: result.reason ?? null,
    lastPublishErrorCode: result.errorCode ?? null,
  });
}
