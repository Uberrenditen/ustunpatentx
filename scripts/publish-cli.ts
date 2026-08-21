import { getBerlinParts, isPublishHour } from "../lib/berlin";
import { tweetForNow } from "../lib/generate";
import { createXPost, getXApiConfig, splitIntoTweetParts } from "../lib/x-api";

async function main() {
  const force = process.argv.includes("--force");
  const { hour, dateKey } = getBerlinParts();
  if (!force && !isPublishHour()) {
    console.log(`skip outside_7_22_berlin hour=${hour} day=${dateKey}`);
    return;
  }

  const cfg = getXApiConfig();
  if (!cfg) {
    console.error("X API anahtarları eksik (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)");
    process.exit(1);
  }

  const tweet = tweetForNow();
  console.log(`posting ${tweet.ticker} ${tweet.hour}:50 (${tweet.text.length} chars)`);

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

  if (!result.ok) {
    console.error(result.errorCode, result.error);
    process.exit(1);
  }

  console.log(`ok tweetId=${result.tweetId}`);
}

void main();
