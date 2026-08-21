"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onSettings = pathname.includes("/settings");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#e4e4e7] text-zinc-950">
      <header className="border-b border-zinc-300 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/admin/x"
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                onSettings
                  ? "border border-zinc-300 bg-white text-zinc-600"
                  : "bg-zinc-950 text-white"
              }`}
            >
              X Haberleri
            </Link>
            <Link
              href="/admin/settings"
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                onSettings
                  ? "bg-zinc-950 text-white"
                  : "border border-zinc-300 bg-white text-zinc-600"
              }`}
            >
              Ayarlar
            </Link>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold uppercase tracking-wide text-zinc-950">{title}</h1>
              <p className="mt-1 max-w-xl text-sm font-medium text-zinc-700">{subtitle}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {children}
      </main>
    </div>
  );
}
