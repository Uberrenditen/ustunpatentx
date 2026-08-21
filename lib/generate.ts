import { getBerlinParts } from "./berlin";
import { loadPublisherConfig, loadPublisherRuntime, type PublisherConfig } from "./publisher-config";
import { loadConfig } from "./store";

export type GeneratedPost = {
  text: string;
  ticker: string;
};

function extractTicker(text: string): string {
  const tag = text.match(/#([A-Za-z0-9ÇĞİÖŞÜçğıöşü_]{2,20})/);
  return tag?.[1]?.toUpperCase() ?? "IP";
}

function cleanPost(text: string): string {
  return text
    .replace(/^```(?:text|tweet)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["«»]|["«»]$/g, "")
    .trim();
}

export async function generatePostFromPrompt(opts?: {
  prompt?: string;
  apiKey?: string;
  recentTexts?: string[];
}): Promise<GeneratedPost> {
  const config = opts?.prompt ? null : await loadPublisherConfig();
  const runtime = opts?.recentTexts ? null : await loadPublisherRuntime();
  const prompt = (opts?.prompt ?? config?.prompt ?? "").trim();
  if (!prompt) {
    throw new Error("Prompt boş. Yönetim panelinden bir prompt kaydedin.");
  }
  let apiKey = (opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    const stored = await loadConfig();
    apiKey = stored.openaiKey?.trim() || "";
  }
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY eksik. İçerik üretmek için bir OpenAI anahtarı gerekir.");
  }
  const recent = (opts?.recentTexts ?? runtime?.recentTexts ?? []).filter(Boolean).slice(0, 8);
  const { dateKey, hour, minute } = getBerlinParts();
  const user = [
    prompt,
    "",
    `Şu an Europe/Berlin: ${dateKey} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    recent.length ? `Son paylaşılan metinleri tekrarlama:\n- ${recent.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.95,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You write a single social post. Output only the post text. No preamble, no markdown fences, no surrounding quotes.",
        },
        { role: "user", content: user },
      ],
    }),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `OpenAI hatası (${res.status})`);
  }
  const text = cleanPost(json.choices?.[0]?.message?.content || "");
  if (!text) throw new Error("Model boş metin döndü");
  return { text, ticker: extractTicker(text) };
}

export async function previewGeneratedPost(config?: PublisherConfig): Promise<GeneratedPost> {
  const publisher = config ?? (await loadPublisherConfig());
  return generatePostFromPrompt({ prompt: publisher.prompt });
}
