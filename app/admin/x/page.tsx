"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitHubHostingPanel } from "../../github-hosting";

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
  secrets: {
    apiKey: SecretStatus;
    apiSecret: SecretStatus;
    accessToken: SecretStatus;
    accessTokenSecret: SecretStatus;
  };
  lastPublishAt?: string | null;
  lastPublishOk?: boolean | null;
  lastPublishReason?: string | null;
  lastPublishErrorCode?: string | null;
  posts: PostRow[];
  preview?: { isToday: boolean; remaining: number; dayKey: string | null; tweets?: PreviewTweet[] };
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

export default function AdminXPage() {
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES === "true") {
    return <GitHubHostingPanel />;
  }
  return <AdminXPageLive />;
}

function AdminXPageLive() {
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
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenSecret, setAccessTokenSecret] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    setApiKey(json.secrets?.apiKey?.value ?? "");
    setApiSecret(json.secrets?.apiSecret?.value ?? "");
    setAccessToken(json.secrets?.accessToken?.value ?? "");
    setAccessTokenSecret(json.secrets?.accessTokenSecret?.value ?? "");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/x-news", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          accessToken,
          accessTokenSecret,
          enabled,
          postsPerRun,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kaydetme başarısız");
      setMessage("Anahtarlar kaydedildi");
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
      if (!res.ok || !json.ok) throw new Error(json.error || "Yeniden oluşturma başarısız");
      setMessage("Günün tweetleri yeniden oluşturuldu");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yeniden oluşturma başarısız");
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

  const secrets = data?.secrets;
  const previewTweets = data?.preview?.tweets ?? [];
  const posts = data?.posts ?? [];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f4f5] text-black">
      <header className="border-b border-black/10 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-wide">
              Otomatik X Haberleri
            </h1>
            <p className="mt-1 max-w-xl text-sm text-black/55">
              Anahtarları kaydedin, kuyruğu kontrol edin, her saat paylaşın.
            </p>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-black/50">
              Standart uygulama yeterli değil.{" "}
              <a
                href="https://developer.x.com/en/portal/dashboard"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-sky-700 hover:underline"
              >
                Developer Portal
              </a>
              {" "}üzerinden X API (pay-per-use) etkinleştirin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={testing}
              onClick={() => void testConnection()}
              className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {testing ? "Kontrol…" : "Bağlantıyı kontrol et"}
            </button>
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
              {saving ? "…" : "Anahtarları kaydet"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Anahtarlar ve tokenlar</h2>
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
          {loading && !data ? (
            <p className="text-sm text-black/45">Yükleniyor…</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField
                  label="API Key"
                  value={apiKey}
                  onChange={setApiKey}
                  status={secrets?.apiKey ?? { set: false, last4: null, value: "" }}
                />
                <SecretField
                  label="API Secret"
                  value={apiSecret}
                  onChange={setApiSecret}
                  status={secrets?.apiSecret ?? { set: false, last4: null, value: "" }}
                />
                <SecretField
                  label="Access Token"
                  value={accessToken}
                  onChange={setAccessToken}
                  status={secrets?.accessToken ?? { set: false, last4: null, value: "" }}
                />
                <SecretField
                  label="Access Token Secret"
                  value={accessTokenSecret}
                  onChange={setAccessTokenSecret}
                  status={secrets?.accessTokenSecret ?? { set: false, last4: null, value: "" }}
                />
              </div>
              <label className="text-sm font-semibold">
                Saatlik paylaşım
                <select
                  value={postsPerRun}
                  onChange={(e) => setPostsPerRun(Number(e.target.value))}
                  className="ml-2 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Günün tweetleri</h2>
            <button
              type="button"
              disabled={regenerating || loading}
              onClick={() => void regenerateTweets()}
              className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {regenerating ? "Oluşturuluyor…" : "Yeniden oluştur"}
            </button>
          </div>
          {previewTweets.length > 0 ? (
            <>
              <p className="mt-2 text-sm text-black/55">
                {previewTweets.length} tweet · {data?.preview?.remaining ?? 0} açık
              </p>
              <ol className="mt-3 space-y-3">
                {previewTweets.map((tweet, index) => (
                  <li
                    key={`${tweet.ticker}-${index}`}
                    className="rounded-xl border border-black/10 bg-zinc-50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-black/45">
                      <span className="tabular-nums">
                        {tweet.hour != null ? `${String(tweet.hour).padStart(2, "0")}:50` : "—"}
                      </span>
                      <span className="text-black">${tweet.ticker}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          tweet.posted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {tweet.posted ? "Paylaşıldı" : "Açık"}
                      </span>
                      <span className="normal-case font-semibold tracking-normal text-black/35">
                        {tweet.chars} karakter
                      </span>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {tweet.text}
                    </pre>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-2 text-sm text-black/45">Henüz tweet yok. Yeniden oluştur’a tıklayın.</p>
          )}
        </section>

        <section className="rounded-xl border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Log</h2>
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
      </main>
    </div>
  );
}
