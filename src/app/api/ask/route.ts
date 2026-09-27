import { NextResponse } from "next/server";
import { z } from "zod";
import { makeProvider, ollamaUp } from "@/lib/schema/providers";
import { resolveTranslatorKeys } from "@/lib/server/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const bodyZod = z.object({ q: z.string().min(3).max(1000) });

const SYSTEM = `You are a concise assistant inside a fast productivity tool. Answer the user's question directly in 1-4 short sentences of plain text — no lists, no markdown, no headers. If you don't know, say so briefly.`;

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

/** "Ask AI" — the generative complement to decision-only answers.
 *  Cascade mirrors the Schema Studio: Ollama (local, GPU) → Groq → Gemini. */
export async function POST(request: Request) {
  const body = bodyZod.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Expected { q: string }" }, { status: 400 });

  const q = body.data.q.trim();
  const key = q.toLowerCase();
  const hit = cache.get(key) as { at: number; data: { text: string; model: string } } | undefined;
  if (hit && Date.now() - hit.at < CACHE_TTL)
    return NextResponse.json({ ...hit.data, cached: true });

  const keys = await resolveTranslatorKeys();
  const errors: string[] = [];

  for (const name of ["ollama", "groq", "gemini"] as const) {
    const prov = makeProvider(name, keys);
    if (!prov) {
      if (name !== "ollama") errors.push(`${name}: no key`);
      continue;
    }
    if (name === "ollama" && !(await ollamaUp())) {
      errors.push("ollama: not running");
      continue;
    }
    try {
      const { text, model } = await prov.run(SYSTEM, q);
      const cleaned = text.replace(/[#*`\[\]]/g, "").trim().slice(0, 900);
      if (!cleaned) throw new Error("empty answer");
      const data = { text: cleaned, model, source: name };
      cache.set(key, { at: Date.now(), data });
      if (cache.size > 300) cache.delete(cache.keys().next().value as string);
      return NextResponse.json(data);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(
    { error: `No answer engine reachable — start Ollama locally or add a free key. (${errors.join(" · ")})` },
    { status: 503 },
  );
}
