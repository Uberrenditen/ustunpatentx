import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_PUBLISHER_CONFIG,
  normalizePublisherConfig,
  type PublisherConfig,
  type PublisherRuntime,
} from "./publisher-settings";

export {
  DEFAULT_PROMPT,
  DEFAULT_PUBLISHER_CONFIG,
  INTERVAL_OPTIONS,
  getBerlinWeekday,
  intervalElapsed,
  isWithinSchedule,
  normalizePublisherConfig,
} from "./publisher-settings";
export type { PublisherConfig, PublisherRuntime } from "./publisher-settings";

const CONFIG_FILE = path.join(process.cwd(), "config", "publisher.json");
const RUNTIME_FILE = path.join(process.cwd(), "config", "runtime.json");

export async function loadPublisherConfig(): Promise<PublisherConfig> {
  try {
    const raw = JSON.parse(await readFile(CONFIG_FILE, "utf8")) as Partial<PublisherConfig>;
    return normalizePublisherConfig(raw);
  } catch {
    return { ...DEFAULT_PUBLISHER_CONFIG };
  }
}

export async function savePublisherConfig(config: PublisherConfig): Promise<PublisherConfig> {
  const next = normalizePublisherConfig(config);
  await mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await writeFile(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function loadPublisherRuntime(): Promise<PublisherRuntime> {
  try {
    const raw = JSON.parse(await readFile(RUNTIME_FILE, "utf8")) as PublisherRuntime;
    return {
      lastPublishAt: typeof raw.lastPublishAt === "string" ? raw.lastPublishAt : null,
      recentTexts: Array.isArray(raw.recentTexts)
        ? raw.recentTexts.filter((row): row is string => typeof row === "string").slice(0, 20)
        : [],
    };
  } catch {
    return { lastPublishAt: null, recentTexts: [] };
  }
}

export async function savePublisherRuntime(runtime: PublisherRuntime): Promise<void> {
  await mkdir(path.dirname(RUNTIME_FILE), { recursive: true });
  await writeFile(
    RUNTIME_FILE,
    `${JSON.stringify({ lastPublishAt: runtime.lastPublishAt, recentTexts: runtime.recentTexts.slice(0, 20) }, null, 2)}\n`,
    "utf8",
  );
}
