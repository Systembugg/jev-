// Core shared types — the contract between Jev (online), the offline
// classifier (local), the calm-UI state machine and every card.

export const INTENT_KEYS = [
  "event",
  "reminder",
  "todo",
  "timer",
  "habit",
  "weather",
  "split",
  "convert",
  "calc",
  "poll",
  "music",
  "search",
  "note",
  "none",
] as const;

export type IntentKey = (typeof INTENT_KEYS)[number];

export const INTENT_LABEL: Record<IntentKey, string> = {
  event: "Event",
  reminder: "Reminder",
  todo: "Checklist",
  timer: "Timer",
  habit: "Habit",
  weather: "Weather",
  split: "Split",
  convert: "Convert",
  calc: "Calculator",
  poll: "Poll",
  music: "Music",
  search: "Web search",
  note: "Note",
  none: "…",
};

export type Answer<T extends string> = {
  value: T;
  confidence: number;
  probabilities: Partial<Record<T, number>>;
};

/** Compact personal context shipped inside Jev's `state` (size-budgeted). */
export type ContextPack = {
  tz?: string;
  locale?: string;
  pinned?: string[];
  songs?: string[];
  recent?: Record<string, number>;
  caps?: string[];
};

/** One classifier decision — identical shape from Jev online and the local mock. */
export type IntentResult = {
  intent: Answer<IntentKey>;
  readiness: number; // 0..2
  signals: {
    isQuestion: boolean;
    recurring: boolean;
    urgency: { score: number; confidence: number };
  };
  latencyMs: number;
  questionCount: number;
  model: string;
  source: "jev" | "offline" | "none" | "error";
  cached?: boolean;
};

export const noneResult = (extra: Partial<IntentResult> = {}): IntentResult => ({
  intent: { value: "none", confidence: 0, probabilities: {} },
  readiness: 0,
  signals: {
    isQuestion: false,
    recurring: false,
    urgency: { score: 0, confidence: 0 },
  },
  latencyMs: 0,
  questionCount: 0,
  model: "none",
  source: "none",
  ...extra,
});
