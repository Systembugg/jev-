import { cookies } from "next/headers";
import { looksLikeKey } from "../jev/client";

/** Key resolution shared by the intent and studio routes.
 *  Priority: env var → httpOnly cookie (set in Settings) → null (offline). */
export async function resolveTypeSafeKey(): Promise<string | null> {
  const env = process.env.TYPESAFE_API_KEY;
  if (looksLikeKey(env)) return env;
  const cookieKey = (await cookies()).get("ts_key")?.value;
  return looksLikeKey(cookieKey) ? cookieKey : null;
}

export async function resolveTranslatorKeys(): Promise<{
  groq: string | null;
  gemini: string | null;
}> {
  const jar = await cookies();
  const groq = process.env.GROQ_API_KEY || jar.get("ts_groq")?.value || null;
  const gemini = process.env.GEMINI_API_KEY || jar.get("ts_gemini")?.value || null;
  return { groq, gemini };
}
