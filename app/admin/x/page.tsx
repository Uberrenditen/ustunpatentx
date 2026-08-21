"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PROMPT,
  DEFAULT_PUBLISHER_CONFIG,
  INTERVAL_OPTIONS,
} from "@/lib/publisher-settings";
import {
  dispatchPublishWorkflow,
  GH_TOKEN_KEY,
  loadPublisherFromGitHub,
  savePublisherToGitHub,
} from "./github";

const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";

const DAYS = [
  { id: 1, label: "Pzt" },
  { id: 2, label: "Sal" },
  { id: 3, label: "Çar" },
  { id: 4, label: "Per" },
  { id: 5, label: "Cum" },
  { id: 6, label: "Cmt" },
  { id: 7, label: "Paz" },
] as const;

function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} dakika`;
  const hours = minutes / 60;
  return hours === 1 ? "1 saat" : `${hours} saat`;
}

type SecretStatus = { set: boolean; last4: string | null; value: string };

type PostRow = {
  id: string;
  dayKey: string;
  ticker: string;
  text: string;
  tweetId: string | null;
  postedAt: string | null;
  status: "queued" | "posted" | "skipped";
  hour: number;
};

type PreviewTweet = {
  ticker: string;
  text: string;
  chars: number;
  posted: boolean;
  hour: number | null;
};

type Payload = {
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
  lastPublishOk?: boolean | null;
  lastPublishReason?: string | null;
  lastPublishErrorCode?: string | null;
  posts: PostRow[];
  preview?: { tweets?: PreviewTweet[] };
};

function SecretField({
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
      <span className="text-xs font-bold uppercase tracking-wide text-black/55">{label}</span>
      <p className="mt-0.5 text-[11px] text-black/40">
        {status.set ? `Kayıtlı · …${status.last4}` : "Henüz boş"}
      </p>
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-black/40"
      />
    </label>
  );
}

function formatWhen(value: string | null): string {
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

const emptySecret: SecretStatus = { set: false, last4: null, value: "" };

export default function AdminXPage() {
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
      const stored = window.localStorage.getItem(GH_TOKEN_KEY) ?? "";
      setGithubToken(stored);
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
        setMessage("Prompt ve zamanlama kaydedildi");
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

  const secrets = data?.secrets;
  const previewTweets = data?.preview?.tweets ?? [];
  const posts = data?.posts ?? [];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f4f5] text-black">
      <header className="border-b border-black/10 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-wide">Otomatik X Haberleri</h1>
            <p className="mt-1 max-w-xl text-sm text-black/55">
              Prompt’u düzenleyin. Her paylaşımda bu metinle yeni içerik üretilir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!IS_PAGES ? (
              <button
                type="button"
                disabled={testing}
                onClick={() => void testConnection()}
                className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {testing ? "Kontrol…" : "Bağlantıyı kontrol et"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={posting}
              onClick={() => void publishNow()}
              className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {posting ? "Paylaşılıyor…" : "Şimdi 1 haber paylaş"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "…" : "Ayarları kaydet"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Prompt</h2>
            <button
              type="button"
              className="text-xs font-bold text-sky-700 hover:underline"
              onClick={() => setPrompt(DEFAULT_PROMPT)}
            >
              Varsayılana dön
            </button>
          </div>
          <p className="mb-3 text-sm text-black/55">
            Müşteri kodu değiştirmeden buradan talimatı günceller. Her otomatik veya manuel paylaşımda bu prompt
            alınır, yeni metin üretilir ve X’te paylaşılır.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-sans text-sm leading-relaxed outline-none focus:border-black/40"
          />
          {!IS_PAGES ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={regenerating || loading}
                onClick={() => void regenerateTweets()}
                className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
              >
                {regenerating ? "Üretiliyor…" : "Prompt ile önizle"}
              </button>
            </div>
          ) : null}
          {previewTweets.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {previewTweets.map((tweet, index) => (
                <li key={`${tweet.ticker}-${index}`} className="rounded-xl border border-black/10 bg-zinc-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-black/45">
                    Önizleme · {tweet.chars} karakter
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{tweet.text}</pre>
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Zamanlama</h2>
            <div className="inline-flex rounded-full border border-black/15 bg-zinc-100 p-0.5">
              <button
                type="button"
                disabled={toggling}
                onClick={() => void setAutoPost(true)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                  enabled ? "bg-emerald-600 text-white" : "text-zinc-500"
                }`}
              >
                Aktif
              </button>
              <button
                type="button"
                disabled={toggling}
                onClick={() => void setAutoPost(false)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                  !enabled ? "bg-zinc-800 text-white" : "text-zinc-500"
                }`}
              >
                Duraklat
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Paylaşım aralığı
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-normal"
              >
                {INTERVAL_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Her {intervalLabel(n)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Her seferinde
              <select
                value={postsPerRun}
                onChange={(e) => setPostsPerRun(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-normal"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} gönderi
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Başlangıç saati (Berlin)
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-normal"
              >
                {hours.map((n) => (
                  <option key={n} value={n}>
                    {String(n).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Bitiş saati (Berlin)
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-normal"
              >
                {hours.map((n) => (
                  <option key={n} value={n}>
                    {String(n).padStart(2, "0")}:59
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-black/45">Günler</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = days.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${
                    active ? "bg-black text-white" : "border border-black/15 bg-white text-black/45"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide">Anahtarlar</h2>
          {IS_PAGES ? (
            <div className="space-y-3 text-sm text-black/65">
              <p>
                X ve OpenAI anahtarları GitHub Secrets içine bir kez konur:{" "}
                <code className="rounded bg-black/5 px-1 font-mono text-xs">X_API_KEY</code>,{" "}
                <code className="rounded bg-black/5 px-1 font-mono text-xs">X_API_SECRET</code>,{" "}
                <code className="rounded bg-black/5 px-1 font-mono text-xs">X_ACCESS_TOKEN</code>,{" "}
                <code className="rounded bg-black/5 px-1 font-mono text-xs">X_ACCESS_TOKEN_SECRET</code>,{" "}
                <code className="rounded bg-black/5 px-1 font-mono text-xs">OPENAI_API_KEY</code>
              </p>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-black/55">
                  GitHub token (ayar kaydı)
                </span>
                <p className="mt-0.5 text-[11px] text-black/40">
                  Contents + Actions izni olan bir token. Sadece bu tarayıcıda saklanır.
                </p>
                <input
                  type="password"
                  autoComplete="off"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-black/40"
                />
              </label>
            </div>
          ) : loading && !data ? (
            <p className="text-sm text-black/45">Yükleniyor…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SecretField
                label="API Key"
                value={apiKey}
                onChange={setApiKey}
                status={secrets?.apiKey ?? emptySecret}
              />
              <SecretField
                label="API Secret"
                value={apiSecret}
                onChange={setApiSecret}
                status={secrets?.apiSecret ?? emptySecret}
              />
              <SecretField
                label="Access Token"
                value={accessToken}
                onChange={setAccessToken}
                status={secrets?.accessToken ?? emptySecret}
              />
              <SecretField
                label="Access Token Secret"
                value={accessTokenSecret}
                onChange={setAccessTokenSecret}
                status={secrets?.accessTokenSecret ?? emptySecret}
              />
              <SecretField
                label="OpenAI API Key"
                value={openaiKey}
                onChange={setOpenaiKey}
                status={secrets?.openaiKey ?? emptySecret}
              />
            </div>
          )}
        </section>

        {!IS_PAGES ? (
          <section className="rounded-xl border border-black/10 bg-white">
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wide">Log</h2>
              <p className="text-xs text-black/45">Son: {formatWhen(data?.lastPublishAt ?? null)}</p>
            </div>
            {posts.length === 0 ? (
              <p className="px-4 py-8 text-sm text-black/45">Henüz paylaşım yok.</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-black/55">
                    <tr>
                      <th className="px-4 py-2">Saat</th>
                      <th className="px-3 py-2">Konu</th>
                      <th className="px-3 py-2">Durum</th>
                      <th className="px-3 py-2">Metin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((row) => {
                      const open = openId === row.id;
                      return (
                        <tr key={row.id} className="border-t border-black/6 align-top">
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-black/70">
                            {formatWhen(row.postedAt)}
                          </td>
                          <td className="px-3 py-3 font-extrabold">
                            {row.tweetId ? (
                              <a
                                href={`https://x.com/i/status/${row.tweetId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-700 hover:underline"
                              >
                                ${row.ticker}
                              </a>
                            ) : (
                              <span>${row.ticker}</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                row.status === "posted"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : row.status === "skipped"
                                    ? "bg-zinc-100 text-zinc-600"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {row.status === "posted"
                                ? "Paylaşıldı"
                                : row.status === "skipped"
                                  ? "Atlandı"
                                  : "Açık"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <p className={open ? "whitespace-pre-wrap" : "line-clamp-3 whitespace-pre-wrap"}>
                              {row.text}
                            </p>
                            {row.text.length > 180 ? (
                              <button
                                type="button"
                                onClick={() => setOpenId(open ? null : row.id)}
                                className="mt-1 text-xs font-bold text-sky-700 hover:underline"
                              >
                                {open ? "Kapat" : "Daha fazla"}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
