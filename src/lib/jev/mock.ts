/**
 * Offline classifier — the "local Jev option".
 * Deterministic keyword/regex scoring with the exact same output shape as the
 * online model, so the UI never knows the difference. When the TypeSafe API
 * is unreachable the route falls back to this silently.
 */
import { noneResult, type IntentKey, type IntentResult } from "./types";
import { QUESTION_COUNT } from "./questions";

const KW: Array<[IntentKey, RegExp[]]> = [
  ["music", [/\bplay\b/i, /\blisten\b/i, /\bsong|music|album|playlist|dj\b/i]],
  ["weather", [/\bweather\b/i, /\bforecast|temperature|raining|sunny|humid(ity)?\b/i]],
  ["split", [/\bsplit\b/i, /\bdivide\b.*\bbetween\b/i]],
  ["convert", [
    /\d+(?:\.\d+)?\s*°?\s*[a-z]{1,12}\s+(to|in|into)\s+°?\s*[a-z]{1,12}\b/i,
    /\bconvert\b/i,
  ]],
  ["timer", [/\b\d+\s?(sec|min|m|h|hour|hr)s?\b/i, /\btimer|stopwatch|pomodoro\b/i]],
  ["habit", [/\bevery\s?(day|morning|night|week)|daily|weekly\b/i, /\b\d+\s?x\s?(a|per)\s?(day|week|month)|habit\b/i]],
  ["poll", [/\bor\b[^?]*\?\s*$/i, /\b(vote|poll|choose|pick|decide)\b.*\bor\b/i]],
  ["search", [/^search\b/i, /\blook ?up\b/i, /\bwho is|what is|when did|news about\b/i]],
  ["reminder", [/\bremind(er)?\s*(me)?\b/i, /\bdon'?t forget\b/i]],
  ["event", [/\bmeet(ing)?|dinner|lunch|brunch|party|zoom|call with|rsvp|appointment\b/i]],
  ["todo", [/\bbuy\b[^.!?]*,/, /\bgroceries|shopping list|checklist|to-?do\b/i]],
  ["calc", [/%\s*of/i, /\bcalc(ulate)?\b/i, /^\s*[\d\s+\-*/().%=]+\s*$/]],
];

function scoreText(t: string): { best: IntentKey; second: IntentKey | null; hits: number; secondHits: number } {
  const scores: Array<[IntentKey, number]> = KW.map(
    ([k, rs]): [IntentKey, number] => [
      k,
      rs.reduce((n, r) => n + (r.test(t) ? 1 : 0), 0),
    ],
  ).sort((a, b) => b[1] - a[1]);
  const top = scores[0];
  const next = scores[1];
  return {
    best: top[1] > 0 ? top[0] : "none",
    second: next && next[1] > 0 ? next[0] : null,
    hits: top[1],
    secondHits: next ? next[1] : 0,
  };
}

export function mockClassify(text: string): IntentResult {
  const started = performance.now();
  const t = text.trim();
  if (t.length < 3) return noneResult({ model: "jev-offline", source: "offline" });

  const { best, second, hits, secondHits } = scoreText(t);
  let key = best;
  let conf = 0.15;
  if (hits > 0) {
    conf = Math.min(0.6 + 0.12 * hits - (secondHits > 0 ? 0.08 : 0), 0.92);
  } else if (t.length > 20) {
    key = "note"; // catch-all for longer text
    conf = 0.4;
  }

  const probabilities: Partial<Record<IntentKey, number>> = { [key]: conf };
  if (second) probabilities[second] = Math.max(0.05, conf - 0.2);

  const urgency = /urgent|asap|immediately|\bnow!*\b/i.test(t)
    ? 2
    : /today|tomorrow|tonight|soon/i.test(t)
      ? 1
      : 0;

  return {
    intent: { value: key, confidence: conf, probabilities },
    readiness: key === "none" ? 0 : t.length >= 16 ? 2 : t.length >= 7 ? 1 : 0,
    signals: {
      isQuestion:
        /^(what|who|when|where|why|how|is|are|was|do|does|can|could)\b/i.test(t) ||
        t.endsWith("?"),
      recurring: /\bevery\b|daily|weekly|monthly|\b\dx a (day|week|month)\b/i.test(t),
      urgency: { score: urgency, confidence: 0.7 },
    },
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
    questionCount: QUESTION_COUNT,
    model: "jev-offline",
    source: "offline",
  };
}
