"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";
const ADMIN_HASH =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD_SHA256 ||
  "76914b4e173680ddc24820eae88b71c593881db177b8d4d69728658369daf8bc";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
      if (IS_PAGES) {
        const hash = await sha256Hex(password);
        if (hash !== ADMIN_HASH) throw new Error("Giriş başarısız");
        sessionStorage.setItem("upx_ok", "1");
        router.replace("/admin/x");
        return;
      }
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
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#e4e4e7] px-4 py-10 text-[#111111]">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-zinc-300 bg-white p-6 shadow-md"
      >
        <h1 className="text-lg font-extrabold uppercase tracking-wide text-zinc-950">
          Üstün Patent X
        </h1>
        <p className="mt-1 text-sm font-medium text-zinc-700">Yönetici şifresini girin</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2.5 text-zinc-950 outline-none focus:border-zinc-900"
          autoFocus
        />
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "…" : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
