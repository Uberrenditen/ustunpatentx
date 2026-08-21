import { TwitterApi } from "twitter-api-v2";

export type XApiConfig = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export function getXApiConfig(): XApiConfig | null {
  const apiKey = process.env.X_API_KEY?.trim();
  const apiSecret = process.env.X_API_SECRET?.trim();
  const accessToken = process.env.X_ACCESS_TOKEN?.trim();
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET?.trim();
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return null;
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

export type XApiErrorCode = "project" | "forbidden" | "duplicate" | "too_long" | "generic";

export type XCreateTweetResult =
  | { ok: true; tweetId: string }
  | {
      ok: false;
      status: number;
      error: string;
      errorCode: XApiErrorCode;
      tooLong?: boolean;
      duplicate?: boolean;
    };

function jsonRecord(json: unknown): Record<string, unknown> | null {
  return json && typeof json === "object" ? (json as Record<string, unknown>) : null;
}

export function extractXErrorText(json: unknown, raw: string): string {
  const rec = jsonRecord(json);
  if (rec) {
    if (typeof rec.detail === "string" && rec.detail.trim()) return rec.detail.trim();
    if (typeof rec.title === "string" && rec.title.trim()) return rec.title.trim();
    const errors = rec.errors;
    if (Array.isArray(errors)) {
      const first = errors[0];
      if (first && typeof first === "object") {
        const row = first as Record<string, unknown>;
        if (typeof row.message === "string" && row.message.trim()) return row.message.trim();
      }
    }
  }
  return raw.trim().slice(0, 400) || "X-API-Fehler";
}

export function classifyXApiError(status: number, text: string): XApiErrorCode {
  const blob = text.toLowerCase();
  if (blob.includes("attached to a project") || blob.includes("developer app that is attached")) {
    return "project";
  }
  if (status === 403 && (blob.includes("duplicate") || blob.includes("already posted"))) {
    return "duplicate";
  }
  if (status === 400 && (blob.includes("too long") || blob.includes("character"))) {
    return "too_long";
  }
  if (status === 401 || status === 403) return "forbidden";
  return "generic";
}

function xClient(cfg: XApiConfig): TwitterApi {
  return new TwitterApi({
    appKey: cfg.apiKey,
    appSecret: cfg.apiSecret,
    accessToken: cfg.accessToken,
    accessSecret: cfg.accessTokenSecret,
  });
}

function failFromUnknown(err: unknown): Extract<XCreateTweetResult, { ok: false }> {
  const rec = err && typeof err === "object" ? (err as Record<string, unknown>) : null;
  const status = typeof rec?.code === "number" ? rec.code : 0;
  const data = rec?.data;
  const fallback = err instanceof Error ? err.message : String(err);
  const error = extractXErrorText(data, fallback);
  const errorCode = classifyXApiError(status, `${error} ${fallback}`);
  return {
    ok: false,
    status,
    error,
    errorCode,
    tooLong: errorCode === "too_long",
    duplicate: errorCode === "duplicate",
  };
}

export async function createXPost(
  cfg: XApiConfig,
  text: string,
  replyToTweetId?: string,
): Promise<XCreateTweetResult> {
  try {
    const payload = replyToTweetId
      ? { text, reply: { in_reply_to_tweet_id: replyToTweetId } }
      : { text };
    const { data } = await xClient(cfg).v2.tweet(payload);
    if (!data?.id) {
      return { ok: false, status: 200, error: "X-Antwort ohne Tweet-ID", errorCode: "generic" };
    }
    return { ok: true, tweetId: data.id };
  } catch (err) {
    return failFromUnknown(err);
  }
}

export async function verifyXConnection(
  cfg: XApiConfig,
): Promise<{ ok: true; handle: string | null } | { ok: false; error: string; errorCode: XApiErrorCode }> {
  try {
    const { data } = await xClient(cfg).v2.me();
    return { ok: true, handle: data?.username ?? null };
  } catch (err) {
    const failed = failFromUnknown(err);
    return { ok: false, error: failed.error, errorCode: failed.errorCode };
  }
}

export function splitIntoTweetParts(text: string, maxChars = 280): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return [trimmed];
  const parts: string[] = [];
  let rest = trimmed;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("\n", maxChars);
    if (cut < maxChars * 0.5) cut = rest.lastIndexOf(" ", maxChars);
    if (cut < maxChars * 0.5) cut = maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
