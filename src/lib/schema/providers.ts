import { GRAMMAR } from "./prompt";

export type ProviderName = "ollama" | "groq" | "gemini";

const ollamaHost = () =>
  (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
const ollamaModel = () => process.env.OLLAMA_MODEL || "qwen3:0.6b";

/** Fast liveness check — do not block the cascade on a dead local server. */
export async function ollamaUp(): Promise<boolean> {
  try {
    const r = await fetch(`${ollamaHost()}/api/tags`, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function genOllama(system: string, user: string) {
  const model = ollamaModel();
  const res = await fetch(`${ollamaHost()}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      system,
      prompt: user,
      stream: false,
      format: GRAMMAR, // grammar-locked decoding
      options: { temperature: 0.2, num_ctx: 4096 },
      keep_alive: 0, // unload when idle — don't hold RAM/VRAM
    }),
    signal: AbortSignal.timeout(60000), // cold start on CPU can be slow
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `ollama ${res.status}${/not found/i.test(t) ? ` — run: ollama pull ${model}` : ""}`,
    );
  }
  const j: unknown = await res.json();
  const text = (j as { response?: unknown })?.response;
  if (typeof text !== "string") throw new Error("ollama: empty response");
  return { text, model };
}

async function genGroq(apiKey: string, system: string, user: string) {
  const model = "llama-3.1-8b-instant"; // free tier
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = j.choices?.[0]?.message?.content;
  if (!text) throw new Error("groq: empty response");
  return { text, model };
}

async function genGemini(apiKey: string, system: string, user: string) {
  const model = "gemini-2.0-flash"; // free tier
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const j = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini: empty response");
  return { text, model };
}

export function makeProvider(
  name: ProviderName,
  keys: { groq?: string | null; gemini?: string | null },
): { name: ProviderName; run: (system: string, user: string) => Promise<{ text: string; model: string }> } | null {
  if (name === "ollama") return { name, run: (s, u) => genOllama(s, u) };
  if (name === "groq") return keys.groq ? { name, run: (s, u) => genGroq(keys.groq!, s, u) } : null;
  return keys.gemini ? { name, run: (s, u) => genGemini(keys.gemini!, s, u) } : null;
}
