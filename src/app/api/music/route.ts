import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Music resolver — query → a playable YouTube videoId.
 * Keyless first: public Piped instances, then Invidious instances.
 * Optional upgrade: YOUTUBE_API_KEY (official Data API v3).
 * Playback itself uses the official YouTube embed player (allowed by design).
 * Cached 6 h per query.
 */

const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: { videoId: string; title: string } | null }>();

const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.private.coffee",
  "https://pipedapi.reallyaweso.me",
];
const INVIDIOUS = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://iv.melmac.space",
];

async function timed(url: string, ms: number): Promise<unknown> {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), cache: "no-store" });
  if (!r.ok) throw new Error(`http ${r.status}`);
  return r.json();
}

async function resolve(q: string): Promise<{ videoId: string; title: string } | null> {
  // 0. Official API if a key exists
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (ytKey) {
    try {
      const j = (await timed(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${ytKey}`,
        4000,
      )) as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }> };
      const it = j.items?.[0];
      if (it?.id?.videoId)
        return { videoId: it.id.videoId, title: it.snippet?.title ?? q };
    } catch { /* fall through */ }
  }

  for (const host of PIPED) {
    try {
      const j = (await timed(
        `${host}/search?q=${encodeURIComponent(q)}&filter=videos`,
        4000,
      )) as { items?: Array<{ url?: string; title?: string }> };
      const first = j.items?.[0];
      const id = /[?&]v=([\w-]{11})/.exec(first?.url ?? "")?.[1];
      if (id) return { videoId: id, title: first?.title ?? q };
    } catch { /* next instance */ }
  }

  for (const host of INVIDIOUS) {
    try {
      const j = (await timed(
        `${host}/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`,
        4000,
      )) as Array<{ videoId?: string; title?: string }>;
      const first = Array.isArray(j) ? j.find((v) => v.videoId) : undefined;
      if (first?.videoId) return { videoId: first.videoId, title: first.title ?? q };
    } catch { /* next instance */ }
  }
  return null;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120);
  if (!q || q.length < 2) return NextResponse.json({ error: "q required" }, { status: 400 });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL && hit.data)
    return NextResponse.json({ ...hit.data, cached: true });

  const data = await resolve(q).catch(() => null);
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);

  if (!data) return NextResponse.json({ fallback: true });
  return NextResponse.json(data);
}
