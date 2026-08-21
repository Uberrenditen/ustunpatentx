const REPO = "https://github.com/Uberrenditen/ustunpatentx";
const SECRETS = `${REPO}/settings/secrets/actions`;
const ACTIONS = `${REPO}/actions/workflows/x-publish.yml`;
const PAGES_URL = "https://uberrenditen.github.io/ustunpatentx/";

export function GitHubHostingPanel() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#f4f4f5] px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-black/45">GitHub</p>
        <h1 className="mt-1 text-lg font-extrabold uppercase tracking-wide">Üstün Patent X</h1>
        <p className="mt-2 text-sm leading-6 text-black/65">
          Canlı adres GitHub Pages. Otomatik paylaşımlar Vercel değil, GitHub Actions ile her saat 50. dakikada
          (07:50–22:50 Berlin) gider.
        </p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-black/75">
          <li>
            Repo → Settings → Secrets and variables → Actions içinde şu dört değeri ekleyin:{" "}
            <code className="rounded bg-black/5 px-1 font-mono text-xs">X_API_KEY</code>,{" "}
            <code className="rounded bg-black/5 px-1 font-mono text-xs">X_API_SECRET</code>,{" "}
            <code className="rounded bg-black/5 px-1 font-mono text-xs">X_ACCESS_TOKEN</code>,{" "}
            <code className="rounded bg-black/5 px-1 font-mono text-xs">X_ACCESS_TOKEN_SECRET</code>
          </li>
          <li>
            Actions → <strong>X Publish</strong> → Run workflow ile şimdi bir gönderi atın.
          </li>
        </ol>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href={SECRETS}
            className="rounded-xl bg-black px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            GitHub Secrets
          </a>
          <a
            href={ACTIONS}
            className="rounded-xl border border-black/15 px-4 py-2.5 text-center text-sm font-semibold"
          >
            X Publish Action
          </a>
          <a href={PAGES_URL} className="text-center text-xs text-black/45 underline">
            {PAGES_URL}
          </a>
        </div>
      </div>
    </div>
  );
}
