import { PACKS, type TaskPack } from "./packs";

/**
 * Zero-model router: an English goal matches a pre-made task pack by keyword
 * overlap. This is the megabytes/milliseconds tier of the translator cascade.
 */
export function routePack(goal: string): { pack: TaskPack; score: number } | null {
  let best: { pack: TaskPack; score: number } | null = null;
  for (const pack of PACKS) {
    const score = pack.keywords.reduce((n, re) => n + (re.test(goal) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { pack, score };
  }
  return best;
}
