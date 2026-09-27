import { z } from "zod";
import type { QuestionDef } from "../jev/questions";

/** A generated (or bundled) question schema, in LLM-friendly array form. */
export type GenSchema = {
  name: string;
  description?: string;
  questions: Array<{
    id: string;
    type: "choice" | "score" | "noul";
    question: string;
    options?: Record<string, string>;
    scale?: string[];
  }>;
};

/** Loose zod parse — strict semantic checks happen in normaliseGenerated(),
 *  which also auto-repairs small-model quirks (bad slugs, missing escape
 *  options) instead of rejecting outright. */
const looseZod = z.object({
  name: z.string(),
  description: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["choice", "score", "noul"]),
      question: z.string(),
      options: z.record(z.string(), z.string()).optional(),
      scale: z.array(z.string()).optional(),
    }),
  ),
});

const slugify = (s: string, fallback: string) => {
  const s2 = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return s2 || fallback;
};

const ESCAPE_RE = /unspecified|none|other|unknown|not mentioned|n\/a/i;

/** Parse + validate + auto-repair a raw model/pack output. Throws with a
 *  human-readable message (fed back into the repair pass) when unfixable. */
export function normaliseGenerated(raw: unknown): GenSchema {
  const parsed = looseZod.safeParse(raw);
  if (!parsed.success) throw new Error("not the expected JSON shape");

  const name = parsed.data.name.trim().slice(0, 60);
  if (name.length < 2) throw new Error("missing schema name");
  const qs = parsed.data.questions.slice(0, 14);
  if (qs.length === 0) throw new Error("no questions generated");

  const used = new Set<string>();
  const questions = qs.map((q, i) => {
    let id = slugify(q.id, `q${i + 1}`);
    while (used.has(id)) id = `${id}_${i + 1}`;
    used.add(id);

    const question = q.question.trim().slice(0, 220);
    if (question.length < 6) throw new Error(`question "${id}" is empty`);

    if (q.type === "choice") {
      const entries = Object.entries(q.options ?? {})
        .map(([k, v]): [string, string] => [slugify(k, `opt${k}`), String(v).trim()])
        .filter(([, v]) => v.length > 0)
        .slice(0, 24);
      if (entries.length < 2)
        throw new Error(`choice "${id}" needs at least 2 options`);
      if (!entries.some(([k, v]) => ESCAPE_RE.test(k) || ESCAPE_RE.test(v)))
        entries.push(["unspecified", "Not mentioned or none of the above"]);
      return { id, type: "choice" as const, question, options: Object.fromEntries(entries) };
    }

    if (q.type === "score") {
      const scale = (q.scale ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 7);
      if (scale.length < 2)
        throw new Error(`score "${id}" needs a rubric scale (at least 2 steps)`);
      return { id, type: "score" as const, question, scale };
    }

    return { id, type: "noul" as const, question };
  });

  return {
    name,
    description: parsed.data.description?.slice(0, 240),
    questions,
  };
}

/** Array form → the Record<string, QuestionDef> the System One API consumes. */
export function toQuestionMap(s: GenSchema): Record<string, QuestionDef> {
  return Object.fromEntries(
    s.questions.map((q) => {
      if (q.type === "choice") return [q.id, { type: "choice", question: q.question, options: q.options! }];
      if (q.type === "score") return [q.id, { type: "score", question: q.question, scale: q.scale! }];
      return [q.id, { type: "noul", question: q.question }];
    }),
  );
}

/** Strip markdown fences a small model might add around JSON. */
export function cleanModelJson(text: string): string {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  return first >= 0 && last > first ? t.slice(first, last + 1) : t;
}
