import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { classifyWithJev, looksLikeKey } from "@/lib/jev/client";
import { mockClassify } from "@/lib/jev/mock";
import { noneResult, type IntentResult } from "@/lib/jev/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  text: z.string().min(1).max(2000),
  context: z
    .object({
      tz: z.string().max(64).optional(),
      locale: z.string().max(32).optional(),
      pinned: z.array(z.string().max(80)).max(10).optional(),
      songs: z.array(z.string().max(80)).max(10).optional(),
      recent: z.record(z.string(), z.number()).optional(),
      caps: z.array(z.string().max(40)).max(24).optional(),
    })
    .optional(),
});

const CACHE_MAX = 500;
const cache = new Map<string, IntentResult>();
const normalizeKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

async function resolveKey(): Promise<string | null> {
  const env = process.env.TYPESAFE_API_KEY;
  if (looksLikeKey(env)) return env;
  const cookieKey = (await cookies()).get("ts_key")?.value;
  if (looksLikeKey(cookieKey)) return cookieKey;
  return null;
}

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Expected { text: string }" }, { status: 400 });

  const { text, context } = body.data;
  const key = normalizeKey(text);
  if (key.length < 2)
    return NextResponse.json(noneResult({ model: "none", source: "none" }));

  const hit = cache.get(key);
  if (hit) return NextResponse.json({ ...hit, latencyMs: 0, cached: true });

  const forcedOffline =
    process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
    request.headers.get("x-shift-mode") === "offline";

  const apiKey = forcedOffline ? null : await resolveKey();

  if (!apiKey) {
    return NextResponse.json(mockClassify(text));
  }

  try {
    const result = await classifyWithJev({ text, context }, apiKey, request.signal);
    console.info(
      `[jev] ${result.model} ${result.latencyMs}ms ${result.questionCount}q ` +
        `"${key.slice(0, 40)}" → ${result.intent.value}`,
    );
    cache.set(key, result);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(result);
  } catch (err) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.warn(
      `[jev] call failed: ${err instanceof Error ? err.message : String(err)} — using offline classifier`,
    );
    // Silent continuity: the card updates from the local classifier instead.
    return NextResponse.json(mockClassify(text));
  }
}
