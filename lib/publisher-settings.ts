import { getBerlinParts } from "./berlin";

export const INTERVAL_OPTIONS = [30, 60, 120, 180, 240, 360] as const;

export type PublisherConfig = {
  enabled: boolean;
  prompt: string;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
  days: number[];
  postsPerRun: number;
};

export type PublisherRuntime = {
  lastPublishAt: string | null;
  recentTexts: string[];
};

export const DEFAULT_PROMPT = `Sen Üstün Patent için X (Twitter) içerik üreticisisin. Her seferinde TEK bir özgün gönderi yaz.

Kurallar:
- Sadece gönderi metnini yaz; açıklama, başlık veya tırnak yok
- En fazla 280 karakter
- Türkçe, uzman ve net
- Konu: marka tescili, patent, tasarım, TÜRKPATENT, Madrid Protokolü, fikri mülkiyet
- Her seferinde farklı bir açı, ipucu veya örnek
- 1–3 ilgili hashtag ekle
- Satış baskısı yapma`;

export const DEFAULT_PUBLISHER_CONFIG: PublisherConfig = {
  enabled: true,
  prompt: DEFAULT_PROMPT,
  intervalMinutes: 60,
  startHour: 7,
  endHour: 22,
  days: [1, 2, 3, 4, 5, 6, 7],
  postsPerRun: 1,
};

function clampHour(value: number): number {
  if (!Number.isFinite(value)) return 7;
  return Math.min(23, Math.max(0, Math.floor(value)));
}

export function normalizePublisherConfig(raw: Partial<PublisherConfig> | null | undefined): PublisherConfig {
  const interval = Number(raw?.intervalMinutes);
  const postsPerRun = Number(raw?.postsPerRun);
  const days = Array.isArray(raw?.days)
    ? [...new Set(raw.days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b)
    : DEFAULT_PUBLISHER_CONFIG.days;
  return {
    enabled: raw?.enabled !== false,
    prompt: typeof raw?.prompt === "string" && raw.prompt.trim() ? raw.prompt : DEFAULT_PROMPT,
    intervalMinutes: INTERVAL_OPTIONS.includes(interval as (typeof INTERVAL_OPTIONS)[number])
      ? interval
      : 60,
    startHour: clampHour(Number(raw?.startHour ?? 7)),
    endHour: clampHour(Number(raw?.endHour ?? 22)),
    days,
    postsPerRun: Number.isFinite(postsPerRun) ? Math.min(5, Math.max(1, Math.floor(postsPerRun))) : 1,
  };
}

export function getBerlinWeekday(now = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[name] ?? 1;
}

export function isWithinSchedule(config: PublisherConfig, now = new Date()): boolean {
  const weekday = getBerlinWeekday(now);
  if (!config.days.includes(weekday)) return false;
  const { hour } = getBerlinParts(now);
  if (config.startHour <= config.endHour) {
    return hour >= config.startHour && hour <= config.endHour;
  }
  return hour >= config.startHour || hour <= config.endHour;
}

export function intervalElapsed(runtime: PublisherRuntime, intervalMinutes: number, now = new Date()): boolean {
  if (!runtime.lastPublishAt) return true;
  const last = Date.parse(runtime.lastPublishAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= intervalMinutes * 60_000;
}
