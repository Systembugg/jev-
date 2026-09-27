import { NextResponse } from "next/server";
import { z } from "zod";
import { routePack } from "@/lib/schema/router";
import { normaliseGenerated, cleanModelJson, toQuestionMap } from "@/lib/schema/types";
import { SYSTEM_PROMPT, buildUserPrompt, buildRepairPrompt } from "@/lib/schema/prompt";
import { makeProvider, ollamaUp, type ProviderName } from "@/lib/schema/providers";
import { templateSchema } from "@/lib/schema/template";
import { resolveTranslatorKeys } from "@/lib/server/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const bodySchema = z.object({
  goal: z.string().min(6).max(600),
  sample: z.string().max(800).optional(),
  provider: z.enum(["auto", "ollama", "groq", "gemini"]).default("auto"),
});

const CACHE_MAX = 100;
const cache = new Map<string, unknown>();

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "Expected { goal: string (6+ chars), provider? }" },
      { status: 400 },
    );

  const { goal, sample, provider } = body.data;
  const cacheKey = `${provider}::${goal.trim().toLowerCase()}::${(sample ?? "").trim().toLowerCase()}`;
  const hit = cache.get(cacheKey) as Record<string, unknown> | undefined;
  if (hit) return NextResponse.json({ ...hit, cached: true });

  // ── Tier 0: task packs (auto mode only — explicit provider = user wants AI)
  if (provider === "auto") {
    const routed = routePack(goal);
    if (routed) {
      const payload = {
        source: "pack",
        name: routed.pack.schema.name,
        description: routed.pack.schema.description ?? routed.pack.blurb,
        packId: routed.pack.id,
        questions: toQuestionMap(routed.pack.schema),
        note: `Matched the pre-made “${routed.pack.name}” pack instantly — no model needed.`,
      };
      cache.set(cacheKey, payload);
      return NextResponse.json(payload);
    }
  }

  // ── Tier 1..n: LLM translator cascade
  const keys = await resolveTranslatorKeys();
  const order: ProviderName[] =
    provider === "auto" ? ["ollama", "groq", "gemini"] : [provider];

  const errors: string[] = [];
  for (const name of order) {
    const prov = makeProvider(name, keys);
    if (!prov) {
      errors.push(`${name}: no key configured`);
      continue;
    }
    if (name === "ollama" && !(await ollamaUp())) {
      errors.push("ollama: not reachable (is Ollama running?)");
      continue;
    }

    const user = buildUserPrompt(goal, sample);
    try {
      return await attempt(prov.run, user, cacheKey, cache);
    } catch (firstErr) {
      // One repair pass: feed the error back, once.
      try {
        const bad = firstErr instanceof GenError ? firstErr.raw : "";
        const reason = firstErr instanceof Error ? firstErr.message : String(firstErr);
        const repair = buildRepairPrompt(user, bad, reason);
        return await attempt(prov.run, repair, cacheKey, cache, true);
      } catch (secondErr) {
        errors.push(
          `${name}: ${secondErr instanceof Error ? secondErr.message : String(secondErr)}`,
        );
      }
    }
  }

  // ── Final tier: generic template (never leave the user empty-handed)
  const tpl = templateSchema(goal);
  return NextResponse.json({
    source: "template",
    name: tpl.name,
    description: tpl.description,
    questions: toQuestionMap(tpl),
    note: `No translator available → generic template. (${errors.join(" · ") || "no providers matched"})`,
  });
}

class GenError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.raw = raw;
  }
}

async function attempt(
  run: (system: string, user: string) => Promise<{ text: string; model: string }>,
  user: string,
  cacheKey: string,
  cache: Map<string, unknown>,
  repaired = false,
) {
  const t0 = performance.now();
  const { text, model } = await run(SYSTEM_PROMPT, user);
  let schema;
  try {
    schema = normaliseGenerated(JSON.parse(cleanModelJson(text)));
  } catch (err) {
    throw new GenError(
      err instanceof Error ? err.message : "invalid schema JSON",
      text,
    );
  }
  const payload = {
    source: repaired ? "llm-repaired" : "llm",
    name: schema.name,
    description: schema.description,
    questions: toQuestionMap(schema),
    meta: { model, ms: Math.round(performance.now() - t0) },
  };
  cache.set(cacheKey, payload);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return NextResponse.json(payload);
}
