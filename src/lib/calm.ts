/**
 * Calm-UI reducer. Raw classifier output flickers while typing, so the visible
 * card only changes when:
 *   - the champion repeats (stays), or
 *   - a challenger is very sure (> 0.8), or
 *   - a challenger wins twice in a row with decent confidence
 */
import type { IntentKey, IntentResult } from "./jev/types";

export type Calm = {
  current: IntentKey;
  challenger: IntentKey | null;
  wins: number;
};

export const initialCalm = (): Calm => ({
  current: "none",
  challenger: null,
  wins: 0,
});

export function applyCalm(s: Calm, r: IntentResult): Calm {
  const k = r.intent.value;
  const c = r.intent.confidence;

  if (k === s.current) return { current: k, challenger: null, wins: 0 };
  if (c >= 0.8) return { current: k, challenger: null, wins: 0 };
  if (s.challenger === k) {
    if (s.wins >= 1 && c >= 0.5) return { current: k, challenger: null, wins: 0 };
    return { current: s.current, challenger: k, wins: s.wins + 1 };
  }
  return { current: s.current, challenger: k, wins: 0 };
}
