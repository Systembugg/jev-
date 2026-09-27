import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Free web answers, no keys:
 *   1. DuckDuckGo Instant Answer (abstract + related links)
 *   2. Wikipedia summary fallback (via opensearch → page summary)
 * Cached 10 min per query.
 */

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

type Answer = {
  heading: string | null;
  abstract: string | null;
  url: string | null;
  links: Array<{ title: string; url: string }>;
  source: "ddg" | "wiki" | "none";
};

async function ddg(q: string): Promise<Answer | null> {
  const j = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
    { signal: AbortSignal.timeout(5000), cache: "no-store" },
  ).then((r) => r.json());

  const links: Array<{ title: string; url: string }> = [];
  const walk = (topics: unknown[]) => {
    for (const t of topics as Array<{ Text?: string; FirstURL?: string; Topics?: unknown[] }>) {
      if (links.length >= 3) return;
      if (t?.Text && t?.FirstURL) links.push({ title: t.Text.slice(0, 90), url: t.FirstURL });
      if (Array.isArray(t?.Topics)) walk(t.Topics);
    }
  };
  if (Array.isArray(j?.RelatedTopics)) walk(j.RelatedTopics);

  if (j?.AbstractText) {
    return {
      heading: j.Heading || q,
      abstract: j.AbstractText,
      url: j.AbstractURL || null,
      links,
      source: "ddg",
    };
  }
  return links.length ? { heading: q, abstract: null, url: null, links, source: "ddg" } : null;
}

async function wiki(q: string): Promise<Answer | null> {
  const found = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(5000), cache: "no-store" },
  ).then((r) => r.json());
  const title: string | undefined = found?.[1]?.[0];
  if (!title) return null;

  const s = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { signal: AbortSignal.timeout(5000), cache: "no-store" },
  ).then((r) => (r.ok ? r.json() : null));
  if (!s?.extract) return null;
  return {
    heading: s.title || title,
    abstract: String(s.extract).slice(0, 420),
    url: s.content_urls?.desktop?.page ?? null,
    links: [],
    source: "wiki",
  };
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 140);
  if (!q || q.length < 3) return NextResponse.json({ error: "q required" }, { status: 400 });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.data);

  let data: Answer = { heading: null, abstract: null, url: null, links: [], source: "none" };
  try {
    data = (await ddg(q)) ?? (await wiki(q)) ?? data;
  } catch {
    /* degrade gracefully — card falls back to outbound link */
  }
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  return NextResponse.json(data);
}
