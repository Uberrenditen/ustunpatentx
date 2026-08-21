import {
  DEFAULT_PUBLISHER_CONFIG,
  normalizePublisherConfig,
  type PublisherConfig,
} from "@/lib/publisher-settings";

export const GITHUB_REPO = "Uberrenditen/ustunpatentx";
export const CONFIG_PATH = "config/publisher.json";
export const GH_TOKEN_KEY = "upx_gh_token";

export const REPO_SECRET_KEYS = [
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
  "OPENAI_API_KEY",
] as const;

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

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
  const headers = ghHeaders(token);
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
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: "main" }),
    },
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(json.message || "Action başlatılamadı");
  }
}

export async function listRepoSecrets(token: string): Promise<Set<string>> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/secrets?per_page=100`, {
    headers: ghHeaders(token),
  });
  const json = (await res.json()) as { secrets?: Array<{ name: string }>; message?: string };
  if (!res.ok) throw new Error(json.message || "GitHub Secrets okunamadı");
  return new Set((json.secrets ?? []).map((row) => row.name));
}

async function encryptSecret(publicKey: string, value: string): Promise<string> {
  const sodium = (await import("libsodium-wrappers")).default;
  await sodium.ready;
  const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const secretBytes = sodium.from_string(value);
  const sealed = sodium.crypto_box_seal(secretBytes, keyBytes);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

export async function saveRepoSecrets(
  token: string,
  values: Record<string, string>,
): Promise<string[]> {
  const headers = ghHeaders(token);
  const keyRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/public-key`, {
    headers,
  });
  const keyJson = (await keyRes.json()) as { key?: string; key_id?: string; message?: string };
  if (!keyRes.ok || !keyJson.key || !keyJson.key_id) {
    throw new Error(keyJson.message || "GitHub Secret anahtarı alınamadı (token’da Secrets izni gerekir)");
  }
  const saved: string[] = [];
  for (const [name, raw] of Object.entries(values)) {
    const value = raw.trim();
    if (!value) continue;
    const encrypted_value = await encryptSecret(keyJson.key, value);
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/${name}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ encrypted_value, key_id: keyJson.key_id }),
    });
    if (!putRes.ok) {
      const putJson = (await putRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(putJson.message || `${name} kaydedilemedi`);
    }
    saved.push(name);
  }
  return saved;
}
