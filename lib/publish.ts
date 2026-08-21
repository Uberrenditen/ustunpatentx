import { getBerlinParts, isPublishHour } from "./berlin";
import { createXPost, splitIntoTweetParts } from "./x-api";
import { regenerateTodayQueue } from "./generate";
import {
  listTweets,
  loadConfig,
  markTweet,
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
};

export async function previewQueue() {
  const { dateKey } = getBerlinParts();
  let tweets = (await listTweets()).filter((row) => row.dayKey === dateKey);
  if (tweets.length === 0) {
    await regenerateTodayQueue();
    tweets = (await listTweets()).filter((row) => row.dayKey === dateKey);
  }
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

export async function publishNext(opts?: {
  force?: boolean;
  manual?: boolean;
  maxPosts?: number;
}): Promise<PublishResult> {
  if (!opts?.force && !opts?.manual && !isPublishHour()) {
    return { ok: true, skipped: true, reason: "outside_7_22_berlin", posted: [], remaining: 0 };
  }

  const config = await loadConfig();
  const cfg = await resolveXApiConfig();
  const enabled = config.enabled !== false;
  if (!cfg) {
    return { ok: true, skipped: true, reason: "x_api_not_configured", posted: [], remaining: 0 };
  }
  if (!opts?.manual && !enabled) {
    return { ok: true, skipped: true, reason: "x_news_publish_disabled", posted: [], remaining: 0 };
  }

  const { dateKey } = getBerlinParts();
  let tweets = (await listTweets()).filter((row) => row.dayKey === dateKey);
  if (tweets.length === 0) {
    await regenerateTodayQueue();
    tweets = (await listTweets()).filter((row) => row.dayKey === dateKey);
  }

  const queue = tweets.filter((row) => row.status === "queued");
  const limit = opts?.maxPosts ?? Math.min(Math.max(config.postsPerRun ?? 1, 1), 5);
  const posted: PublishResult["posted"] = [];

  for (const tweet of queue) {
    if (posted.length >= limit) break;
    let result = await createXPost(cfg, tweet.text);
    if (!result.ok && result.tooLong) {
      const parts = splitIntoTweetParts(tweet.text);
      let replyTo: string | undefined;
      for (const part of parts) {
        result = await createXPost(cfg, part, replyTo);
        if (!result.ok) break;
        replyTo = result.tweetId;
      }
    }
    if (!result.ok && result.duplicate) {
      await markTweet(tweet.id, {
        status: "skipped",
        posted: false,
        postedAt: new Date().toISOString(),
      });
      posted.push({ ticker: tweet.ticker, tweetId: null });
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
        remaining: queue.length - posted.length,
      };
    }
    await markTweet(tweet.id, {
      status: "posted",
      posted: true,
      tweetId: result.tweetId,
      postedAt: new Date().toISOString(),
    });
    posted.push({ ticker: tweet.ticker, tweetId: result.tweetId });
  }

  if (posted.length === 0) {
    const result = { ok: true, skipped: true, reason: "queue_empty", dayKey: dateKey, posted: [], remaining: 0 };
    await recordPublishResult(result);
    return result;
  }

  const remaining = Math.max(0, queue.length - posted.length);
  const result = { ok: true, dayKey: dateKey, posted, remaining };
  await recordPublishResult(result);
  return result;
}
