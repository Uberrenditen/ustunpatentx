import { execSync } from "node:child_process";
import { generatePostFromPrompt } from "../lib/generate";
import {
  intervalElapsed,
  isWithinSchedule,
  loadPublisherConfig,
  loadPublisherRuntime,
  savePublisherRuntime,
} from "../lib/publisher-config";
import { createXPost, getXApiConfig, splitIntoTweetParts } from "../lib/x-api";

async function postText(
  cfg: NonNullable<ReturnType<typeof getXApiConfig>>,
  text: string,
) {
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

function commitRuntime() {
  if (!process.env.GITHUB_ACTIONS) return;
  try {
    execSync("git add config/runtime.json", { stdio: "inherit" });
    execSync(
      'git -c user.name="ustunpatentx" -c user.email="actions@users.noreply.github.com" commit -m "chore: record last X publish"',
      { stdio: "inherit" },
    );
    execSync("git push", { stdio: "inherit" });
  } catch {
    console.log("runtime commit skipped");
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const publisher = await loadPublisherConfig();
  const runtime = await loadPublisherRuntime();

  if (!publisher.enabled && !force) {
    console.log("skip disabled");
    return;
  }
  if (!force && !isWithinSchedule(publisher)) {
    console.log("skip outside_schedule");
    return;
  }
  if (!force && !intervalElapsed(runtime, publisher.intervalMinutes)) {
    console.log("skip interval_not_elapsed");
    return;
  }

  const cfg = getXApiConfig();
  if (!cfg) {
    console.error("X API anahtarları eksik");
    process.exit(1);
  }

  const generated = await generatePostFromPrompt({
    prompt: publisher.prompt,
    recentTexts: runtime.recentTexts,
  });
  console.log(`posting ${generated.ticker} (${generated.text.length} chars)`);

  const result = await postText(cfg, generated.text);
  if (!result.ok) {
    console.error(result.errorCode, result.error);
    process.exit(1);
  }

  runtime.lastPublishAt = new Date().toISOString();
  runtime.recentTexts = [generated.text, ...runtime.recentTexts].slice(0, 20);
  await savePublisherRuntime(runtime);
  commitRuntime();
  console.log(`ok tweetId=${result.tweetId}`);
}

void main();
