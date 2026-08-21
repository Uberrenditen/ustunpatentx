import {
  DEFAULT_PUBLISHER_CONFIG,
  normalizePublisherConfig,
  type PublisherConfig,
} from "@/lib/publisher-settings";

export const GITHUB_REPO = "Uberrenditen/ustunpatentx";
export const CONFIG_PATH = "config/publisher.json";
export const GH_TOKEN_KEY = "upx_gh_token";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function loadPublisherFromGitHub(): Promise<PublisherConfig> {
  const urls = [
    `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${CONFIG_PATH}?t=${Date.now()}`,
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${CONFIG_PATH}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: url.includes("api.github.com")
          ? { Accept: "application/vnd.github.raw+json" }
          : undefined,
      });
      if (!res.ok) continue;
      const raw = (await res.json()) as Partial<PublisherConfig>;
      return normalizePublisherConfig(raw);
    } catch {
      continue;
    }
  }
  return { ...DEFAULT_PUBLISHER_CONFIG };
}

export async function savePublisherToGitHub(token: string, config: PublisherConfig): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const metaRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CONFIG_PATH}`, { headers });
  const meta = (await metaRes.json()) as { sha?: string; message?: string };
  if (!metaRes.ok && metaRes.status !== 404) {
    throw new Error(meta.message || "GitHub dosyası okunamadı");
  }
  const body = normalizePublisherConfig(config);
  const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CONFIG_PATH}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Update publisher prompt and schedule",
      content: toBase64(`${JSON.stringify(body, null, 2)}\n`),
      sha: meta.sha,
    }),
  });
  const putJson = (await putRes.json()) as { message?: string };
  if (!putRes.ok) throw new Error(putJson.message || "GitHub’a kaydedilemedi");
}

export async function dispatchPublishWorkflow(token: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/x-publish.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(json.message || "Action başlatılamadı");
  }
}
