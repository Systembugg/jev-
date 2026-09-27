import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { looksLikeKey } from "@/lib/jev/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const COOKIES = {
  jev: "ts_key",
  groq: "ts_groq",
  gemini: "ts_gemini",
} as const;

export async function GET() {
  const jar = await cookies();
  const jevCookie = jar.get(COOKIES.jev)?.value;
  const envKey = process.env.TYPESAFE_API_KEY;
  const has = (k: string | undefined) => looksLikeKey(k);
  return NextResponse.json({
    model: process.env.JEV_MODEL || "jev-latest",
    endpoint: process.env.JEV_ENDPOINT || "https://api.typesafe.ai/v1/systemone",
    online: has(envKey) || has(jevCookie),
    source: has(envKey) ? "env" : has(jevCookie) ? "cookie" : null,
    forcedOffline: process.env.NEXT_PUBLIC_USE_MOCK === "true",
    translator: {
      ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL || "qwen3:0.6b",
      groq: has(process.env.GROQ_API_KEY) || looksLikeKey(jar.get(COOKIES.groq)?.value),
      gemini: has(process.env.GEMINI_API_KEY) || looksLikeKey(jar.get(COOKIES.gemini)?.value),
    },
  });
}

const postSchema = z.object({
  key: z.string().max(200).optional(),
  groqKey: z.string().max(200).optional(),
  geminiKey: z.string().max(200).optional(),
  clear: z.boolean().optional(),
  clearGroq: z.boolean().optional(),
  clearGemini: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = postSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Bad body" }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  const b = body.data;

  if (b.clear) res.cookies.set(COOKIES.jev, "", { path: "/", maxAge: 0 });
  if (b.clearGroq) res.cookies.set(COOKIES.groq, "", { path: "/", maxAge: 0 });
  if (b.clearGemini) res.cookies.set(COOKIES.gemini, "", { path: "/", maxAge: 0 });

  const allow = (v: string | undefined) => (v ?? "").trim().length >= 12;
  if (b.key !== undefined && allow(b.key) && b.key !== "")
    res.cookies.set(COOKIES.jev, b.key.trim(), { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE });
  if (b.groqKey !== undefined && b.groqKey.trim().length > 0 && allow(b.groqKey))
    res.cookies.set(COOKIES.groq, b.groqKey.trim(), { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE });
  if (b.geminiKey !== undefined && b.geminiKey.trim().length > 0 && allow(b.geminiKey))
    res.cookies.set(COOKIES.gemini, b.geminiKey.trim(), { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE });

  return res;
}
