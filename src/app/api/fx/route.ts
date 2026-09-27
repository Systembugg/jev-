import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Frankfurter — free ECB exchange rates, no key. Cached 1 h. */

const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map<string, { at: number; rate: number }>();
const CODE = /^[A-Za-z]{3}$/;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const from = sp.get("from")?.toUpperCase() ?? "";
  const to = sp.get("to")?.toUpperCase() ?? "";
  const amount = Number(sp.get("amount") ?? "1");
  if (!CODE.test(from) || !CODE.test(to) || !Number.isFinite(amount))
    return NextResponse.json({ error: "from, to (ISO 4217), amount required" }, { status: 400 });

  const key = `${from}:${to}`;
  let rate = cache.get(key);
  if (!rate || Date.now() - rate.at >= CACHE_TTL) {
    try {
      const j = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`,
        { signal: AbortSignal.timeout(5000), cache: "no-store" },
      ).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`fx ${r.status}`))));
      const r = j?.rates?.[to];
      if (typeof r !== "number") throw new Error("rate unavailable");
      rate = { at: Date.now(), rate: r };
      cache.set(key, rate);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "fx lookup failed" },
        { status: 502 },
      );
    }
  }
  return NextResponse.json({ from, to, amount, rate: rate.rate, result: rate.rate * amount });
}
