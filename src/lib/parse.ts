/** Deterministic value parsers — code extracts values, the model only decides. */

export function parseTodo(text: string): string[] {
  return text
    .replace(/^(please\s+)?(buy|get|pick up|do|todo[s]?:?|list:?)\s*/i, "")
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export type TimerSpec = {
  amount: number;
  unit: "hr" | "min" | "sec";
  seconds: number;
  label: string;
};

export function parseTimer(text: string): TimerSpec | null {
  const m = text.trim().match(/(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m|secs?|s)\b/i);
  if (!m) return null;
  const amount = Number(m[1]);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99_999) return null;
  const raw = m[2].toLowerCase();
  const unit: TimerSpec["unit"] = raw.startsWith("h") ? "hr" : raw.startsWith("m") ? "min" : "sec";
  const seconds = unit === "hr" ? amount * 3600 : unit === "min" ? amount * 60 : amount;
  return { amount, unit, seconds, label: `${amount} ${unit}` };
}

const round = (n: number) =>
  Math.abs(n) >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : Number(n.toFixed(4)).toString();

export function parseCalc(text: string): string | null {
  const pct = text.match(/([\d.]+)\s*%\s*of\s*([\d.]+)/i);
  if (pct) {
    const v = (Number(pct[1]) / 100) * Number(pct[2]);
    return `${pct[1]}% of ${pct[2]} = ${round(v)}`;
  }
  const cleaned = text.replace(/[^0-9+\-*/(). ]/g, "").trim();
  if (
    !/\d/.test(cleaned) ||
    !/[+\-*/]/.test(cleaned) ||
    !/^[\d+\-*/. ()]+$/.test(cleaned)
  )
    return null;
  try {
    const v = Function(`"use strict"; return (${cleaned})`)() as number;
    if (typeof v !== "number" || !isFinite(v)) return null;
    return `${cleaned.trim()} = ${round(v)}`;
  } catch {
    return null;
  }
}

export function parseEvent(text: string) {
  const day = text.match(
    /\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this weekend)\b/i,
  )?.[0];
  const time = text.match(/\b(\d{1,2}(:\d{2})?\s?(am|pm))\b/i)?.[0];
  const people = text
    .match(/with\s+([a-z ,&]+?)(?=\s+(today|tomorrow|tonight|at|on|next|this)\b|$)/i)?.[1]
    ?.trim();
  const mode = /zoom|meet|video|facetime|teams/i.test(text)
    ? "Video call"
    : /call|phone/i.test(text)
      ? "Call"
      : null;
  return { day, time, people, mode };
}

export function parseMusic(text: string): string {
  return text.replace(/^(please\s+)?(play|listen to|put on|song:?|music:?)\s*/i, "").trim();
}

export function parseSearch(text: string): string {
  return text.replace(/^(please\s+)?search\s*(for)?\s*/i, "").trim();
}

export const fmtSecs = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(ss).padStart(2, "0")}`;
};

/* ── Split ─────────────────────────────────────────────────────── */
export function parseSplit(text: string) {
  const m = text.match(
    /split\s+(?:rs\.?\s*|₹|inr|usd|\$|€)?\s*([\d,]+(?:\.\d+)?)\s*(?:rs\.?\s*|₹|inr|usd|\$|€)?\s*(?:between|among|for|with)\s*(\d+)/i,
  );
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, ""));
  const n = Number(m[2]);
  if (!Number.isFinite(amount) || !Number.isFinite(n) || n < 1 || amount <= 0) return null;
  const each = Math.floor((amount / n) * 100) / 100;
  const splitTotal = each * n;
  return {
    amount,
    n,
    each,
    remainder: Math.round((amount - splitTotal) * 100) / 100,
    symbol: /₹|rs\.?|inr/i.test(text) ? "₹" : /\$|usd/i.test(text) ? "$" : /€/.test(text) ? "€" : "₹",
  };
}

export const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/* ── Convert (units in code, currency via live rate) ───────────── */
const UNIT_ALIAS: Record<string, string> = {
  mile: "mi", miles: "mi", mi: "mi",
  km: "km", kms: "km", kilometer: "km", kilometers: "km",
  m: "m", meter: "m", meters: "m", metre: "m", metres: "m",
  cm: "cm", centimeter: "cm", centimeters: "cm",
  mm: "mm",
  ft: "ft", foot: "ft", feet: "ft",
  in: "in", inch: "in", inches: "in",
  yd: "yd", yard: "yd", yards: "yd",
  kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  g: "g", gram: "g", grams: "g",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  oz: "oz", ounce: "oz", ounces: "oz",
  c: "c", f: "f", celsius: "c", fahrenheit: "f",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  ml: "ml",
  gal: "gal", gallon: "gal", gallons: "gal",
  kmh: "kmh", kph: "kmh", kmph: "kmh", mph: "mph",
};

const CATS: Record<string, string[]> = {
  length: ["mi", "km", "m", "cm", "mm", "ft", "in", "yd"],
  mass: ["kg", "g", "lb", "oz"],
  temp: ["c", "f"],
  volume: ["l", "ml", "gal"],
  speed: ["kmh", "mph"],
};

const FACTOR: Record<string, Record<string, number>> = {
  length: { mi: 1609.344, km: 1000, m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, yd: 0.9144 },
  mass: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495231 },
  volume: { l: 1, ml: 0.001, gal: 3.785411784 },
  speed: { kmh: 1, mph: 1.609344 },
};

const CURRENCY = new Set([
  "USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "AED",
  "SGD", "BRL", "ZAR", "KRW", "THB", "MXN", "NZD",
]);

export type ConvertSpec =
  | { kind: "unit"; amount: number; from: string; to: string; cat: string; result: number }
  | { kind: "currency"; amount: number; from: string; to: string };

export function parseConvert(text: string): ConvertSpec | null {
  const m = text.match(
    /(\d+(?:\.\d+)?)\s*°?\s*([a-z]{1,12})\s*(?:to|in|into|as)\s*°?\s*([a-z]{1,12})\b/i,
  );
  if (!m) return null;
  const amount = Number(m[1]);
  const u1 = m[2].toLowerCase();
  const u2 = m[3].toLowerCase();

  const c1 = CURRENCY.has(u1.toUpperCase());
  const c2 = CURRENCY.has(u2.toUpperCase());
  if (c1 && c2)
    return { kind: "currency", amount, from: u1.toUpperCase(), to: u2.toUpperCase() };

  const from = UNIT_ALIAS[u1];
  const to = UNIT_ALIAS[u2];
  if (!from || !to) return null;
  const cat = Object.keys(CATS).find((c) => CATS[c].includes(from) && CATS[c].includes(to));
  if (!cat) return null;

  let result: number;
  if (cat === "temp") {
    result =
      from === to ? amount : from === "c" ? (amount * 9) / 5 + 32 : (amount - 32) * (5 / 9);
  } else {
    result = (amount * FACTOR[cat][from]) / FACTOR[cat][to];
  }
  return { kind: "unit", amount, from, to, cat, result };
}

/* ── Weather place ─────────────────────────────────────────────── */
export function parseWeatherPlace(text: string): string | null {
  let p =
    text.match(/weather\s+(?:in|at|for|like in)\s+([a-z\s'-]{2,40})/i)?.[1] ??
    text.match(/(?:temperature|forecast|rain|humidity)\s+(?:in|at|for)\s+([a-z\s'-]{2,40})/i)?.[1] ??
    text.match(/\bin\s+([a-z\s'-]{2,40})\s+(?:weather|temperature|forecast)/i)?.[1] ??
    text.match(/^([a-z\s'-]{2,40}?)\s+(?:weather|temperature|forecast)/i)?.[1];
  if (!p) return null;
  p = p.replace(/\b(today|now|please|tomorrow|this week|right now)\b/gi, "").trim();
  return p.length >= 2 ? p : null;
}

/* ── Habit ─────────────────────────────────────────────────────── */
export function parseHabit(text: string) {
  const freq =
    /every\s?(day)|daily|everyday/i.test(text)
      ? "Every day"
      : text.match(/(\d+)\s?x\s?(?:a|per)\s?(day|week|month)/i)
        ? `${text.match(/(\d+)\s?x\s?(?:a|per)\s?(day|week|month)/i)![1]}× per ${text.match(/(\d+)\s?x\s?(?:a|per)\s?(day|week|month)/i)![2].toLowerCase()}`
        : /weekly|every week/i.test(text)
          ? "Every week"
          : /weekdays?/i.test(text)
            ? "Weekdays"
            : null;
  const time = /morning/i.test(text)
    ? "Morning"
    : /afternoon/i.test(text)
      ? "Afternoon"
      : /evening|night/i.test(text)
        ? "Evening"
        : null;
  return { freq, time };
}

/* ── Poll ──────────────────────────────────────────────────────── */
export function parsePollOptions(text: string): string[] | null {
  let t = text.replace(/\?\s*$/, "");
  t = t.replace(/^(please\s+)?(vote|poll|choose|pick|decide)\s*(one)?\s*(between)?\s*:?\s*/i, "");
  const parts = t
    .split(/,|\s+or\s+/i)
    .map((s) => s.trim().replace(/^(and)\s+/i, ""))
    .filter((s) => s.length > 0 && s.length <= 40);
  return parts.length >= 2 ? parts.slice(0, 6) : null;
}

/* ── Reminder time (deterministic; next occurrence in local time) ── */
export type ReminderSpec = { at: number; label: string };

export function parseReminderTime(text: string, now: number = Date.now()): ReminderSpec | null {
  const s = text.toLowerCase();

  // "in 30 min" / "in 2 hours"
  const rel = s.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)\b/);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const ms = unit.startsWith("h") ? n * 3600_000 : unit.startsWith("s") ? n * 1000 : n * 60_000;
    const at = now + ms;
    return { at, label: `in ${n} ${unit.startsWith("h") ? "hr" : unit.startsWith("s") ? "sec" : "min"}` };
  }

  const dayWord = s.match(/\b(today|tonight|tomorrow)\b/)?.[1];
  const tm = s.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (tm || dayWord) {
    const d = new Date(now);
    if (dayWord === "tomorrow") d.setDate(d.getDate() + 1);
    if (tm) {
      let h = Number(tm[1]);
      const min = Number(tm[2] ?? 0);
      const ap = tm[3];
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    } else {
      d.setHours(dayWord === "tonight" ? 20 : 9, 0, 0, 0); // "tomorrow" → 9 AM, "tonight" → 8 PM
    }
    if (d.getTime() <= now) d.setDate(d.getDate() + 1); // time passed today → tomorrow
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const isToday = d.toDateString() === new Date(now).toDateString();
    return { at: d.getTime(), label: `${isToday ? "today" : "tomorrow"} ${time}` };
  }

  return null;
}
