"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Giriş başarısız");
      router.replace("/admin/x");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#f4f4f5] px-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-extrabold uppercase tracking-wide">Üstün Patent X</h1>
        <p className="mt-1 text-sm text-black/55">Yönetici şifresini girin</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-xl border border-black/15 px-3 py-2.5 outline-none focus:border-black/40"
          autoFocus
        />
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "…" : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
