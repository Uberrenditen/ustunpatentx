"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_PROMPT, DEFAULT_PUBLISHER_CONFIG } from "@/lib/publisher-settings";
import {
  dispatchPublishWorkflow,
  GH_TOKEN_KEY,
  loadPublisherFromGitHub,
  savePublisherToGitHub,
} from "./x/github";

export const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";

export const DAYS = [
  { id: 1, label: "Pzt" },
  { id: 2, label: "Sal" },
  { id: 3, label: "Çar" },
  { id: 4, label: "Per" },
  { id: 5, label: "Cum" },
  { id: 6, label: "Cmt" },
  { id: 7, label: "Paz" },
] as const;

export type SecretStatus = { set: boolean; last4: string | null; value: string };

export type PostRow = {
  id: string;
  dayKey: string;
  ticker: string;
  text: string;
  tweetId: string | null;
  postedAt: string | null;
  status: "queued" | "posted" | "skipped";
  hour: number;
};

export type PreviewTweet = {
  ticker: string;
  text: string;
  chars: number;
  posted: boolean;
  hour: number | null;
};

export type Payload = {
  storedEnabled: boolean;
  postsPerRun: number;
  prompt: string;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
  days: number[];
  secrets: {
    apiKey: SecretStatus;
    apiSecret: SecretStatus;
    accessToken: SecretStatus;
    accessTokenSecret: SecretStatus;
    openaiKey?: SecretStatus;
  };
  lastPublishAt?: string | null;
  posts: PostRow[];
  preview?: { tweets?: PreviewTweet[] };
};

export const emptySecret: SecretStatus = { set: false, last4: null, value: "" };

export function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} dakika`;
  const hours = minutes / 60;
  return hours === 1 ? "1 saat" : `${hours} saat`;
}

export function formatWhen(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("tr-TR", {
      timeZone: "Europe/Berlin",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export function SecretField({
  label,
  value,
  onChange,
  status,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  status: SecretStatus;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-700">{label}</span>
      <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
        {status.set ? `Kayıtlı · …${status.last4}` : "Henüz boş"}
      </p>
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 font-mono text-sm text-zinc-950 outline-none focus:border-zinc-900"
      />
    </label>
  );
}

export function usePublisherAdmin() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [postsPerRun, setPostsPerRun] = useState(1);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [startHour, setStartHour] = useState(7);
  const [endHour, setEndHour] = useState(22);
  const [days, setDays] = useState<number[]>(DEFAULT_PUBLISHER_CONFIG.days);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenSecret, setAccessTokenSecret] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (IS_PAGES && typeof window !== "undefined" && sessionStorage.getItem("upx_ok") !== "1") {
      router.replace("/login");
      return;
    }
    try {
      if (IS_PAGES) {
        const publisher = await loadPublisherFromGitHub();
        setEnabled(publisher.enabled);
        setPostsPerRun(publisher.postsPerRun);
        setPrompt(publisher.prompt);
        setIntervalMinutes(publisher.intervalMinutes);
        setStartHour(publisher.startHour);
        setEndHour(publisher.endHour);
        setDays(publisher.days);
        setData({
          storedEnabled: publisher.enabled,
          postsPerRun: publisher.postsPerRun,
          prompt: publisher.prompt,
          intervalMinutes: publisher.intervalMinutes,
          startHour: publisher.startHour,
          endHour: publisher.endHour,
          days: publisher.days,
          secrets: {
            apiKey: emptySecret,
            apiSecret: emptySecret,
            accessToken: emptySecret,
            accessTokenSecret: emptySecret,
            openaiKey: emptySecret,
          },
          posts: [],
          preview: { tweets: [] },
        });
        setLoading(false);
        return;
      }
      const res = await fetch("/api/admin/x-news");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(json.error || "Yükleme başarısız");
        setData(null);
        setLoading(false);
        return;
      }
      setData(json);
      setEnabled(json.storedEnabled);
      setPostsPerRun(json.postsPerRun);
      setPrompt(json.prompt || DEFAULT_PROMPT);
      setIntervalMinutes(json.intervalMinutes || 60);
      setStartHour(json.startHour ?? 7);
      setEndHour(json.endHour ?? 22);
      setDays(json.days?.length ? json.days : DEFAULT_PUBLISHER_CONFIG.days);
      setApiKey(json.secrets?.apiKey?.value ?? "");
      setApiSecret(json.secrets?.apiSecret?.value ?? "");
      setAccessToken(json.secrets?.accessToken?.value ?? "");
      setAccessTokenSecret(json.secrets?.accessTokenSecret?.value ?? "");
      setOpenaiKey(json.secrets?.openaiKey?.value ?? "");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (IS_PAGES) {
      setGithubToken(window.localStorage.getItem(GH_TOKEN_KEY) ?? "");
    }
    void load();
  }, [load]);

  function publisherPayload() {
    return {
      enabled,
      prompt,
      intervalMinutes,
      startHour,
      endHour,
      days,
      postsPerRun,
    };
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (IS_PAGES) {
        if (!githubToken.trim()) throw new Error("Ayarları kaydetmek için bir GitHub token girin");
        window.localStorage.setItem(GH_TOKEN_KEY, githubToken.trim());
        await savePublisherToGitHub(githubToken, publisherPayload());
        setMessage("Ayarlar kaydedildi");
        await load();
        return;
      }
      const res = await fetch("/api/admin/x-news", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...publisherPayload(),
          apiKey,
          apiSecret,
          accessToken,
          accessTokenSecret,
          openaiKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kaydetme başarısız");
      setMessage("Ayarlar kaydedildi");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function setAutoPost(next: boolean) {
    if (enabled === next) return;
    const previous = enabled;
    setEnabled(next);
    setToggling(true);
    try {
      if (IS_PAGES) {
        if (!githubToken.trim()) throw new Error("Kaydetmek için GitHub token gerekli");
        await savePublisherToGitHub(githubToken, { ...publisherPayload(), enabled: next });
        return;
      }
      const res = await fetch("/api/admin/x-news", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kaydetme başarısız");
      setEnabled(json.storedEnabled !== false);
    } catch (err) {
      setEnabled(previous);
      setError(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setToggling(false);
    }
  }

  async function publishNow() {
    setPosting(true);
    setMessage(null);
    setError(null);
    try {
      if (IS_PAGES) {
        if (!githubToken.trim()) throw new Error("Paylaşmak için GitHub token gerekli");
        await dispatchPublishWorkflow(githubToken);
        setMessage("GitHub Action başlatıldı — prompt ile içerik üretilip paylaşılacak");
        return;
      }
      const res = await fetch("/api/admin/x-news/publish", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.reason || "Paylaşım başarısız");
      if (json.skipped) setMessage(`Atlandı: ${json.reason ?? ""}`);
      else setMessage("1 haber paylaşıldı");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paylaşım başarısız");
    } finally {
      setPosting(false);
    }
  }

  async function regenerateTweets() {
    setRegenerating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/x-news/regenerate", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Üretim başarısız");
      setData((current) =>
        current ? { ...current, preview: json.preview ?? current.preview } : current,
      );
      setMessage("Prompt ile yeni içerik üretildi (henüz paylaşılmadı)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Üretim başarısız");
    } finally {
      setRegenerating(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/x-news/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Bağlantı başarısız");
      setMessage(`Bağlantı tamam${json.handle ? `: @${json.handle}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı başarısız");
    } finally {
      setTesting(false);
    }
  }

  function toggleDay(id: number) {
    setDays((current) =>
      current.includes(id) ? current.filter((day) => day !== id) : [...current, id].sort((a, b) => a - b),
    );
  }

  return {
    data,
    loading,
    error,
    message,
    saving,
    posting,
    testing,
    regenerating,
    toggling,
    enabled,
    postsPerRun,
    prompt,
    intervalMinutes,
    startHour,
    endHour,
    days,
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
    openaiKey,
    githubToken,
    openId,
    setPrompt,
    setPostsPerRun,
    setIntervalMinutes,
    setStartHour,
    setEndHour,
    setApiKey,
    setApiSecret,
    setAccessToken,
    setAccessTokenSecret,
    setOpenaiKey,
    setGithubToken,
    setOpenId,
    save,
    setAutoPost,
    publishNow,
    regenerateTweets,
    testConnection,
    toggleDay,
  };
}
