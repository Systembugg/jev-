import type { QuestionDef } from "../jev/questions";

export type SimulatedAnswer = {
  choice?: string;
  confidence: number;
  probabilities?: Record<string, number>;
  score?: number;
  noul?: number;
};
export type SimulatedAnswers = Record<string, SimulatedAnswer>;

const STOP = new Set([
  "the", "and", "for", "with", "this", "that", "from", "what", "how",
  "does", "are", "was", "were", "you", "your", "about", "into",
]);

function toks(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Offline answer simulator for arbitrary generated schemas — lets the Studio
 * playground demo any schema without an API key. Honest keyword-overlap
 * heuristics, clearly labelled "sim" in the UI.
 */
export function simulateAnswers(
  text: string,
  questions: Record<string, QuestionDef>,
): SimulatedAnswers {
  const words = new Set(toks(text));
  const out: SimulatedAnswers = {};

  for (const [id, def] of Object.entries(questions)) {
    if (def.type === "choice") {
      const scored = Object.entries(def.options)
        .map(([k, label]) => ({ k, hits: toks(`${k} ${label}`).filter((w) => words.has(w)).length }))
        .sort((a, b) => b.hits - a.hits);
      const top = scored[0];
      const total = scored.reduce((n, s) => n + s.hits, 0) || 1;
      // Prefer real content options over escape hatches unless nothing matched.
      const best = top.hits === 0 ? scored[scored.length - 1] : top;
      const confidence = Math.min(0.35 + Math.max(0.25, best.hits / total), 0.9);
      const probabilities: Record<string, number> = {};
      let left = 1 - confidence;
      for (const s of scored.slice(0, 4)) {
        if (s.k === best.k) continue;
        probabilities[s.k] = Math.max(0.01, Number((left * Math.max(0.1, s.hits + 0.4) / total).toFixed(3)));
        left -= probabilities[s.k];
      }
      probabilities[best.k] = confidence;
      out[id] = { choice: best.k, confidence: Number(confidence.toFixed(3)), probabilities };
    } else if (def.type === "score") {
      const mid = Math.floor((def.scale.length - 1) / 2);
      out[id] = { score: mid, confidence: 0.5 };
    } else {
      const hits = toks(def.question).filter((w) => words.has(w)).length;
      out[id] = { noul: hits > 0 ? 0.72 : 0.3, confidence: 0.55 };
    }
  }
  return out;
}
