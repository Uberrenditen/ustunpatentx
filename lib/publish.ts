import { getBerlinParts } from "./berlin";
import { generatePostFromPrompt } from "./generate";
import {
  intervalElapsed,
  isWithinSchedule,
  loadPublisherConfig,
  loadPublisherRuntime,
  savePublisherRuntime,
} from "./publisher-config";
import { createXPost, splitIntoTweetParts } from "./x-api";
import {
  appendTweet,
  listTweets,
  loadConfig,
  recordPublishResult,
  resolveXApiConfig,
} from "./store";

export type PreviewTweet = {
  ticker: string;
  text: string;
  chars: number;
  posted: boolean;
  hour: number | null;
};

export type PublishResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  errorCode?: string;
  dayKey?: string;
  posted: Array<{ ticker: string; tweetId: string | null }>;
  remaining: number;
  text?: string;
};

export async function previewQueue() {
  const { dateKey } = getBerlinParts();
  const tweets = (await listTweets()).filter((row) => row.dayKey === dateKey);
  const preview: PreviewTweet[] = tweets.map((row) => ({
    ticker: row.ticker,
    text: row.text,
    chars: row.text.length,
    posted: row.status === "posted",
    hour: row.hour,
  }));
  const remaining = preview.filter((row) => !row.posted).length;
  return {
    dayKey: dateKey,
    isToday: true,
    remaining,
    next: preview.find((row) => !row.posted) ?? null,
    tweets: preview,
  };
}

async function postText(cfg: NonNullable<Awaited<ReturnType<typeof resolveXApiConfig>>>, text: string) {
  let result = await createXPost(cfg, text);
  if (!result.ok && result.tooLong) {
    const parts = splitIntoTweetParts(text);
    let replyTo: string | undefined;
    for (const part of parts) {
      result = await createXPost(cfg, part, replyTo);
      if (!result.ok) break;
      replyTo = result.tweetId;
    }
  }
  return result;
}

export async function publishNext(opts?: {
  force?: boolean;
  manual?: boolean;
  maxPosts?: number;
}): Promise<PublishResult> {
  const publisher = await loadPublisherConfig();
  const runtime = await loadPublisherRuntime();
  const { dateKey, hour } = getBerlinParts();

  if (!opts?.force && !opts?.manual && !isWithinSchedule(publisher)) {
    return { ok: true, skipped: true, reason: "outside_schedule", posted: [], remaining: 0 };
  }
  if (!opts?.force && !opts?.manual && !intervalElapsed(runtime, publisher.intervalMinutes)) {
    return { ok: true, skipped: true, reason: "interval_not_elapsed", posted: [], remaining: 0 };
  }

  const config = await loadConfig();
  const cfg = await resolveXApiConfig();
  const enabled = publisher.enabled && config.enabled !== false;
  if (!cfg) {
    return { ok: true, skipped: true, reason: "x_api_not_configured", posted: [], remaining: 0 };
  }
  if (!opts?.manual && !enabled) {
    return { ok: true, skipped: true, reason: "x_news_publish_disabled", posted: [], remaining: 0 };
  }

  const limit = opts?.maxPosts ?? publisher.postsPerRun;
  const posted: PublishResult["posted"] = [];
  let lastText = "";

  for (let i = 0; i < limit; i += 1) {
    const generated = await generatePostFromPrompt({
      prompt: publisher.prompt,
      recentTexts: [lastText, ...runtime.recentTexts].filter(Boolean),
    });
    lastText = generated.text;
    const result = await postText(cfg, generated.text);
    const nowIso = new Date().toISOString();

    if (!result.ok && result.duplicate) {
      await appendTweet({
        id: `${dateKey}_${Date.now()}_${i}`,
        dayKey: dateKey,
        hour,
        ticker: generated.ticker,
        text: generated.text,
        posted: false,
        tweetId: null,
        postedAt: nowIso,
        status: "skipped",
      });
      posted.push({ ticker: generated.ticker, tweetId: null });
      continue;
    }
    if (!result.ok) {
      await recordPublishResult({
        ok: false,
        reason: result.error,
        errorCode: result.errorCode,
      });
      return {
        ok: false,
        reason: result.error,
        errorCode: result.errorCode,
        dayKey: dateKey,
        posted,
        remaining: 0,
        text: generated.text,
      };
    }

    await appendTweet({
      id: `${dateKey}_${Date.now()}_${i}`,
      dayKey: dateKey,
      hour,
      ticker: generated.ticker,
      text: generated.text,
      posted: true,
      tweetId: result.tweetId,
      postedAt: nowIso,
      status: "posted",
    });
    posted.push({ ticker: generated.ticker, tweetId: result.tweetId });
    runtime.recentTexts = [generated.text, ...runtime.recentTexts].slice(0, 20);
  }

  if (posted.length === 0) {
    const result = { ok: true, skipped: true, reason: "nothing_posted", dayKey: dateKey, posted: [], remaining: 0 };
    await recordPublishResult(result);
    return result;
  }

  runtime.lastPublishAt = new Date().toISOString();
  await savePublisherRuntime(runtime);
  const result = { ok: true, dayKey: dateKey, posted, remaining: 0, text: lastText };
  await recordPublishResult(result);
  return result;
}
