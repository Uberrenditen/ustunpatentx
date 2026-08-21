"use client";

import { INTERVAL_OPTIONS } from "@/lib/publisher-settings";
import { AdminShell } from "../AdminShell";
import {
  DAYS,
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
        <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-zinc-950">Anahtarlar</h2>
        <p className="mb-4 text-sm font-medium text-zinc-700">
          Otomatik paylaşım için gerekli tüm anahtarlar. Boş bırakılan alanlar mevcut kayıtları silmez.
        </p>
        {admin.loading && !admin.data ? (
          <p className="text-sm font-medium text-zinc-600">Yükleniyor…</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-zinc-700">GitHub</h3>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-700">GitHub Token</span>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
                  Personal Access Token mit Rechten Contents, Actions und Secrets. Wird nur in diesem Browser
                  gespeichert.{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-sky-800 hover:underline"
                  >
                    Token erstellen
                  </a>
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
            <div>
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-zinc-700">X / Twitter</h3>
              <p className="mb-3 text-[11px] font-medium text-zinc-600">
                Developer Portal → App → Keys and tokens.{" "}
                <a
                  href="https://developer.x.com/en/portal/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-800 hover:underline"
                >
                  Portal öffnen
                </a>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField
                  label="X API Key"
                  value={admin.apiKey}
                  onChange={admin.setApiKey}
                  status={secrets?.apiKey ?? emptySecret}
                />
                <SecretField
                  label="X API Secret"
                  value={admin.apiSecret}
                  onChange={admin.setApiSecret}
                  status={secrets?.apiSecret ?? emptySecret}
                />
                <SecretField
                  label="X Access Token"
                  value={admin.accessToken}
                  onChange={admin.setAccessToken}
                  status={secrets?.accessToken ?? emptySecret}
                />
                <SecretField
                  label="X Access Token Secret"
                  value={admin.accessTokenSecret}
                  onChange={admin.setAccessTokenSecret}
                  status={secrets?.accessTokenSecret ?? emptySecret}
                />
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-zinc-700">ChatGPT / OpenAI</h3>
              <p className="mb-3 text-[11px] font-medium text-zinc-600">
                Wird für jeden Post aus dem Prompt neuen Text erzeugt.{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-800 hover:underline"
                >
                  API-Key erstellen
                </a>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField
                  label="ChatGPT / OpenAI API Key"
                  value={admin.openaiKey}
                  onChange={admin.setOpenaiKey}
                  status={secrets?.openaiKey ?? emptySecret}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
