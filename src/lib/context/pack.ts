/**
 * Context Pack — the "little database" Jev gets access to.
 * A compact, size-budgeted snapshot of the user's local data that ships inside
 * Jev's `state`, so decisions can be personalised:
 *   "play something chill" → Jev sees your saved songs + recent plays
 *   "remind me again"      → Jev sees your pinned/recent cards
 * Offline mode: this never leaves the device (state is classified locally).
 */
import type { ContextPack } from "../jev/types";
import { listCards, listSongs } from "../db";

const CAPS = [
  "note.create",
  "event.create",
  "reminder.create",
  "todo.create",
  "timer.start",
  "calc.evaluate",
  "music.play",
  "search.web",
];

const MAX_ITEMS = 5;
const MAX_TEXT = 60;
const clip = (s: string) => s.slice(0, MAX_TEXT);

export async function getContextPack(): Promise<ContextPack> {
  const base: ContextPack = {
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: typeof navigator !== "undefined" ? navigator.language : "en",
    caps: CAPS,
  };
  try {
    const [cardsRes, songsRes] = await Promise.all([
      listCards().catch(() => undefined),
      listSongs().catch(() => undefined),
    ]);
    const cards = (cardsRes ?? []).sort((a, b) => b.ts - a.ts);
    const songs = (songsRes ?? []).sort((a, b) => b.ts - a.ts);
    const recent = JSON.parse(
      localStorage.getItem("recent-intents") || "{}",
    ) as Record<string, number>;

    return {
      ...base,
      pinned: cards.slice(0, MAX_ITEMS).map((c) => clip(`${c.intent}: ${c.text}`)),
      songs: songs.slice(0, MAX_ITEMS).map((s) => clip(s.text)),
      recent,
    };
  } catch {
    return base;
  }
}

export function noteRecent(intent: string) {
  try {
    const m = JSON.parse(localStorage.getItem("recent-intents") || "{}");
    m[intent] = (m[intent] || 0) + 1;
    localStorage.setItem("recent-intents", JSON.stringify(m));
  } catch {
    /* storage full/blocked — ignore */
  }
}
