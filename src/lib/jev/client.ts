import { INTENT_KEYS, noneResult, type IntentResult } from "./types";
import { questions, QUESTION_COUNT } from "./questions";

const ENDPOINT =
  process.env.JEV_ENDPOINT || "https://api.typesafe.ai/v1/systemone";
const MODEL = process.env.JEV_MODEL || "jev-latest";
const TIMEOUT_MS = 2500; // one fast attempt — a stale answer is worse than the offline fallback

/** A real-looking key: not empty and not a copied placeholder. */
export function looksLikeKey(key: string | undefined | null): key is string {
  const k = key?.trim() ?? "";
  return k.length >= 12 && !/\.{3}|your|xxx|placeholder|changeme|<|>/i.test(k);
}

/**
 * One call, every question in parallel against { text, context }.
 * Throws on network / API / shape errors so the caller can fall back.
 *
 * Wire format note: SDK-free — we POST { state, model, questions } directly.
 * Question defs serialize Choice/Score/Noul per TypeSafe docs.
 */
export async function classifyWithJev(
  state: { text: string; context?: unknown },
  apiKey: string,
  signal?: AbortSignal,
): Promise<IntentResult> {
  const started = performance.now();

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const composite = signal
    ? AbortSignal.any([signal, timeout])
    : timeout;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      state,
      model: MODEL,
      questions: serializeQuestions(),
    }),
    signal: composite,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`jev api ${res.status}`);
  const json: unknown = await res.json();
  return mapResponse(json, Math.round(performance.now() - started));
}

function serializeQuestions() {
  // Pass our descriptor map through; the API accepts Choice (options),
  // Score (rubric scale) and Noul (yes/no probability) definitions.
  return questions;
}

function toIntentKey(v: unknown): (typeof INTENT_KEYS)[number] {
  return typeof v === "string" &&
    (INTENT_KEYS as readonly string[]).includes(v)
    ? (v as (typeof INTENT_KEYS)[number])
    : "note";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapResponse(json: any, latencyMs: number): IntentResult {
  const a = json?.answers ?? json;
  if (!a || typeof a !== "object") throw new Error("jev: bad response shape");
  const intent = a.intent;
  if (typeof intent?.choice !== "string") throw new Error("jev: missing intent");

  const asNoul = (q: any): boolean => Boolean(q?.noul ?? q?.value ?? false);
  const asScore = (q: any) => ({
    score: Number(q?.score ?? 0),
    confidence: Number(q?.confidence ?? 0),
  });

  return {
    intent: {
      value: toIntentKey(intent.choice),
      confidence: Number(intent.confidence ?? 0),
      probabilities: (intent.probabilities ?? {}) as Record<string, number>,
    },
    readiness: Number(a.readiness?.score ?? 0),
    signals: {
      isQuestion: asNoul(a.isQuestion),
      recurring: asNoul(a.recurring),
      urgency: asScore(a.urgency),
    },
    latencyMs,
    questionCount: QUESTION_COUNT,
    model: String(json?.model ?? MODEL),
    source: "jev",
  };
}

export { noneResult };
