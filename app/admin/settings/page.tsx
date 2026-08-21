"use client";

import { INTERVAL_OPTIONS } from "@/lib/publisher-settings";
import { AdminShell } from "../AdminShell";
import {
  DAYS,
  IS_PAGES,
  SecretField,
  emptySecret,
  intervalLabel,
  usePublisherAdmin,
} from "../use-publisher-admin";

export default function AdminSettingsPage() {
  const admin = usePublisherAdmin();
  const secrets = admin.data?.secrets;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <AdminShell
      title="Ayarlar"
      subtitle="Zamanlama, günler ve API anahtarları. Prompt X Haberleri sayfasındadır."
      actions={
        <button
          type="button"
          disabled={admin.saving}
          onClick={() => void admin.save()}
          className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {admin.saving ? "…" : "Ayarları kaydet"}
        </button>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-950">Zamanlama</h2>
          <div className="inline-flex rounded-full border border-zinc-300 bg-zinc-100 p-0.5">
            <button
              type="button"
              disabled={admin.toggling}
              onClick={() => void admin.setAutoPost(true)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                admin.enabled ? "bg-emerald-600 text-white" : "text-zinc-500"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              disabled={admin.toggling}
              onClick={() => void admin.setAutoPost(false)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                !admin.enabled ? "bg-zinc-800 text-white" : "text-zinc-500"
              }`}
            >
              Duraklat
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-zinc-950">
            Paylaşım aralığı
            <select
              value={admin.intervalMinutes}
              onChange={(e) => admin.setIntervalMinutes(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 text-sm font-normal text-zinc-950"
            >
              {INTERVAL_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Her {intervalLabel(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-950">
            Her seferinde
            <select
              value={admin.postsPerRun}
              onChange={(e) => admin.setPostsPerRun(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 text-sm font-normal text-zinc-950"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} gönderi
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-950">
            Başlangıç saati (Berlin)
            <select
              value={admin.startHour}
              onChange={(e) => admin.setStartHour(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 text-sm font-normal text-zinc-950"
            >
              {hours.map((n) => (
                <option key={n} value={n}>
                  {String(n).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-950">
            Bitiş saati (Berlin)
            <select
              value={admin.endHour}
              onChange={(e) => admin.setEndHour(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 text-sm font-normal text-zinc-950"
            >
              {hours.map((n) => (
                <option key={n} value={n}>
                  {String(n).padStart(2, "0")}:59
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-700">Günler</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const active = admin.days.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => admin.toggleDay(day.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${
                  active ? "bg-zinc-950 text-white" : "border border-zinc-300 bg-white text-zinc-500"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-300 bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-zinc-950">Anahtarlar</h2>
        {IS_PAGES ? (
          <div className="space-y-3 text-sm font-medium text-zinc-700">
            <p>
              X ve OpenAI anahtarları GitHub Secrets içine bir kez konur:{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-950">X_API_KEY</code>,{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-950">X_API_SECRET</code>,{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-950">X_ACCESS_TOKEN</code>,{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-950">X_ACCESS_TOKEN_SECRET</code>,{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-950">OPENAI_API_KEY</code>
            </p>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-700">
                GitHub token (ayar kaydı)
              </span>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                Contents + Actions izni olan bir token. Sadece bu tarayıcıda saklanır.
              </p>
              <input
                type="password"
                autoComplete="off"
                value={admin.githubToken}
                onChange={(e) => admin.setGithubToken(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 font-mono text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>
          </div>
        ) : admin.loading && !admin.data ? (
          <p className="text-sm font-medium text-zinc-600">Yükleniyor…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <SecretField
              label="API Key"
              value={admin.apiKey}
              onChange={admin.setApiKey}
              status={secrets?.apiKey ?? emptySecret}
            />
            <SecretField
              label="API Secret"
              value={admin.apiSecret}
              onChange={admin.setApiSecret}
              status={secrets?.apiSecret ?? emptySecret}
            />
            <SecretField
              label="Access Token"
              value={admin.accessToken}
              onChange={admin.setAccessToken}
              status={secrets?.accessToken ?? emptySecret}
            />
            <SecretField
              label="Access Token Secret"
              value={admin.accessTokenSecret}
              onChange={admin.setAccessTokenSecret}
              status={secrets?.accessTokenSecret ?? emptySecret}
            />
            <SecretField
              label="OpenAI API Key"
              value={admin.openaiKey}
              onChange={admin.setOpenaiKey}
              status={secrets?.openaiKey ?? emptySecret}
            />
          </div>
        )}
      </section>
    </AdminShell>
  );
}
