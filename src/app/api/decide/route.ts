import { NextResponse } from "next/server";
import { z } from "zod";
import { simulateAnswers } from "@/lib/schema/simulate";
import { resolveTypeSafeKey } from "@/lib/server/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defZod = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choice"),
    question: z.string().min(4).max(220),
    options: z.record(z.string(), z.string()),
  }),
  z.object({
    type: z.literal("score"),
    question: z.string().min(4).max(220),
    scale: z.array(z.string()).min(2).max(7),
  }),
  z.object({
    type: z.literal("noul"),
    question: z.string().min(4).max(220),
  }),
]);

const bodyZod = z.object({
  state: z.object({ text: z.string().min(1).max(4000) }),
  questions: z.record(z.string().max(40), defZod),
});

/**
 * Generic decision runner for the Studio playground: runs ANY question schema.
 * Online (key set) → real Jev. Otherwise → local keyword simulator (labelled).
 */
export async function POST(request: Request) {
  const body = bodyZod.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Expected { state: { text }, questions }" }, { status: 400 });

  const { state, questions } = body.data;
  const count = Object.keys(questions).length;
  if (count === 0 || count > 24)
    return NextResponse.json({ error: "questions: 1-24 entries" }, { status: 400 });

  const apiKey = await resolveTypeSafeKey();
  const forcedOffline =
    process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
    request.headers.get("x-shift-mode") === "offline";

  if (apiKey && !forcedOffline) {
    const started = performance.now();
    try {
      const res = await fetch(
        process.env.JEV_ENDPOINT || "https://api.typesafe.ai/v1/systemone",
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            state,
            model: process.env.JEV_MODEL || "jev-latest",
            questions,
          }),
          signal: request.signal,
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error(`jev api ${res.status}`);
      const json = (await res.json()) as { answers?: unknown; model?: string };
      return NextResponse.json({
        source: "jev",
        model: json.model ?? process.env.JEV_MODEL ?? "jev-latest",
        latencyMs: Math.round(performance.now() - started),
        questionCount: count,
        answers: json.answers ?? json,
      });
    } catch (err) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      console.warn(`[decide] online failed: ${err instanceof Error ? err.message : err} — simulating`);
    }
  }

  const started = performance.now();
  const answers = simulateAnswers(state.text, questions);
  return NextResponse.json({
    source: "sim",
    model: "sim-offline",
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
    questionCount: count,
    answers,
  });
}
