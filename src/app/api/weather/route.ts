import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open-Meteo — free, no key. Geocode → current weather. Cached 15 min. */

const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

const WMO: Array<[number[], string, string]> = [
  [[0], "Clear sky", "sun"],
  [[1, 2], "Partly cloudy", "cloud"],
  [[3], "Overcast", "cloud"],
  [[45, 48], "Fog", "fog"],
  [[51, 53, 55, 56, 57], "Drizzle", "rain"],
  [[61, 63, 65, 66, 67], "Rain", "rain"],
  [[71, 73, 75, 77], "Snow", "snow"],
  [[80, 81, 82], "Rain showers", "rain"],
  [[85, 86], "Snow showers", "snow"],
  [[95, 96, 99], "Thunderstorm", "storm"],
];

const describe = (code: number): [string, string] => {
  for (const [codes, label, emoji] of WMO) if (codes.includes(code)) return [label, emoji];
  return ["Unknown", "🌡️"];
};

export async function GET(request: Request) {
  const place = new URL(request.url).searchParams.get("place")?.trim().slice(0, 60);
  if (!place) return NextResponse.json({ error: "place required" }, { status: 400 });

  const key = place.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.data);

  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" },
    ).then((r) => r.json());
    const loc = geo?.results?.[0];
    if (!loc) return NextResponse.json({ error: `No place found for “${place}”` });

    const wx = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" },
    ).then((r) => r.json());

    const [label, icon] = describe(wx?.current?.weather_code ?? -1);
    const data = {
      place: `${loc.name}${loc.country ? `, ${loc.country}` : ""}`,
      temp: wx.current.temperature_2m,
      feels: wx.current.apparent_temperature,
      humidity: wx.current.relative_humidity_2m,
      wind: wx.current.wind_speed_10m,
      hi: wx.daily?.temperature_2m_max?.[0],
      lo: wx.daily?.temperature_2m_min?.[0],
      label,
      icon,
    };
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "weather lookup failed" },
      { status: 502 },
    );
  }
}
