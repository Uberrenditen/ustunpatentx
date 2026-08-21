"use client";

import { DEFAULT_PROMPT } from "@/lib/publisher-settings";
import { AdminShell } from "../AdminShell";
import {
  IS_PAGES,
  formatWhen,
  usePublisherAdmin,
} from "../use-publisher-admin";

export default function AdminXPage() {
  const admin = usePublisherAdmin();
  const previewTweets = admin.data?.preview?.tweets ?? [];
  const posts = admin.data?.posts ?? [];

  return (
    <AdminShell
      title="Otomatik X Haberleri"
      subtitle="Prompt’u buradan düzenleyin. Zamanlama ve anahtarlar Ayarlar’dadır."
      actions={
        <>
          {!IS_PAGES ? (
            <button
              type="button"
              disabled={admin.testing}
              onClick={() => void admin.testConnection()}
              className="rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50"
            >
              {admin.testing ? "Kontrol…" : "Bağlantıyı kontrol et"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={admin.posting}
            onClick={() => void admin.publishNow()}
            className="rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50"
          >
            {admin.posting ? "Paylaşılıyor…" : "Şimdi 1 haber paylaş"}
          </button>
          <button
            type="button"
            disabled={admin.saving}
            onClick={() => void admin.save()}
            className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {admin.saving ? "…" : "Prompt’u kaydet"}
          </button>
        </>
      }
    >
      {admin.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{admin.error}</p>
      ) : null}
      {admin.message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {admin.message}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-300 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-950">Prompt</h2>
          <button
            type="button"
            className="text-xs font-bold text-sky-800 hover:underline"
            onClick={() => admin.setPrompt(DEFAULT_PROMPT)}
          >
            Varsayılana dön
          </button>
        </div>
        <p className="mb-3 text-sm font-medium text-zinc-700">
          Her otomatik veya manuel paylaşımda bu prompt alınır, yeni metin üretilir ve X’te paylaşılır.
        </p>
        <textarea
          value={admin.prompt}
          onChange={(e) => admin.setPrompt(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 font-sans text-sm leading-relaxed text-zinc-950 outline-none focus:border-zinc-900"
        />
        {!IS_PAGES ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={admin.regenerating || admin.loading}
              onClick={() => void admin.regenerateTweets()}
              className="rounded-xl border border-zinc-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {admin.regenerating ? "Üretiliyor…" : "Prompt ile önizle"}
            </button>
          </div>
        ) : null}
        {previewTweets.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {previewTweets.map((tweet, index) => (
              <li key={`${tweet.ticker}-${index}`} className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Önizleme · {tweet.chars} karakter
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-950">
                  {tweet.text}
                </pre>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {!IS_PAGES ? (
        <section className="rounded-xl border border-zinc-300 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-950">Log</h2>
            <p className="text-xs font-medium text-zinc-600">
              Son: {formatWhen(admin.data?.lastPublishAt ?? null)}
            </p>
          </div>
          {posts.length === 0 ? (
            <p className="px-4 py-8 text-sm font-medium text-zinc-600">Henüz paylaşım yok.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-700">
                  <tr>
                    <th className="px-4 py-2">Saat</th>
                    <th className="px-3 py-2">Konu</th>
                    <th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Metin</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((row) => {
                    const open = admin.openId === row.id;
                    return (
                      <tr key={row.id} className="border-t border-zinc-200 align-top">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                          {formatWhen(row.postedAt)}
                        </td>
                        <td className="px-3 py-3 font-extrabold">
                          {row.tweetId ? (
                            <a
                              href={`https://x.com/i/status/${row.tweetId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-800 hover:underline"
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
                              onClick={() => admin.setOpenId(open ? null : row.id)}
                              className="mt-1 text-xs font-bold text-sky-800 hover:underline"
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
    </AdminShell>
  );
}
