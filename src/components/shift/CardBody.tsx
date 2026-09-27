"use client";

import { useEffect, useState, type ReactElement } from "react";
import { INTENT_LABEL, type IntentKey } from "@/lib/jev/types";
import * as DB from "@/lib/db";
import {
  fmtMoney,
  parseCalc,
  parseConvert,
  parseEvent,
  parseHabit,
  parseMusic,
  parsePollOptions,
  parseReminderTime,
  parseSearch,
  parseSplit,
  parseTimer,
  parseTodo,
  parseWeatherPlace,
} from "@/lib/parse";
import {
  IconBell, IconCalc, IconCalendar, IconClock, IconCloud, IconCloudRain,
  IconCloudSnow, IconConvert, IconExternal, IconFog, IconHeart, IconList,
  IconMusic, IconNote, IconPlay, IconPoll, IconRepeat, IconSearch,
  IconSparkles, IconSplit, IconStorm, IconSun,
} from "@/components/icons";

const INTENT_META: Record<Exclude<IntentKey, "none">, { tint: string; Icon: (p: { s?: number }) => ReactElement }> = {
  event: { tint: "#e0607e", Icon: IconCalendar },
  reminder: { tint: "#e8a13b", Icon: IconBell },
  todo: { tint: "#2f9e44", Icon: IconList },
  timer: { tint: "#e8a13b", Icon: IconClock },
  habit: { tint: "#0ca15e", Icon: IconRepeat },
  weather: { tint: "#2b9fd8", Icon: IconCloud },
  split: { tint: "#e8a13b", Icon: IconSplit },
  convert: { tint: "#13a89e", Icon: IconConvert },
  calc: { tint: "#2f9e44", Icon: IconCalc },
  poll: { tint: "#e0607e", Icon: IconPoll },
  music: { tint: "#7a4fd0", Icon: IconMusic },
  search: { tint: "#2b5bb7", Icon: IconSearch },
  note: { tint: "#706e68", Icon: IconNote },
};

export default function CardBody({
  intent,
  text,
  onSaved,
}: {
  intent: IntentKey;
  text: string;
  onSaved?: () => void;
}) {
  const meta = intent !== "none" ? INTENT_META[intent] : null;
  return (
    <div>
      <div className="cardtitle">
        {meta && (
          <span style={{ color: meta.tint, display: "inline-grid", placeItems: "center" }}>
            <meta.Icon s={13} />
          </span>
        )}
        {INTENT_LABEL[intent]}
      </div>
      <Body intent={intent} text={text} onSaved={onSaved} />
    </div>
  );
}

/* ── tiny debounced fetch hook (aborts on every keystroke) ────── */
function useFetch<T>(url: string | null): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let dead = false;
    setLoading(true);
    const ac = new AbortController();
    const id = setTimeout(() => {
      fetch(url, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http ${r.status}`))))
        .then((j) => { if (!dead) { setData(j); setLoading(false); } })
        .catch(() => { if (!dead) setLoading(false); });
    }, 350);
    return () => { dead = true; ac.abort(); clearTimeout(id); };
  }, [url]);
  return { data, loading };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function Body({
  intent,
  text,
  onSaved,
}: {
  intent: IntentKey;
  text: string;
  onSaved?: () => void;
}) {
  switch (intent) {
    case "todo": {
      const items = parseTodo(text);
      if (!items.length) return <div className="sub">Keep typing your items…</div>;
      return (
        <ul className="checklist">
          {items.map((it, i) => (
            <li key={i}><span className="box" />{it}</li>
          ))}
        </ul>
      );
    }
    case "timer": {
      const t = parseTimer(text);
      return (
        <>
          <div className="big timerface">{t ? t.label : "…"}</div>
          <div className="sub">
            {/focus|pomodoro|deep work/i.test(text) ? "Focus session" : "Countdown"} ·{" "}
            <b>Enter starts it</b> — it keeps ticking in the corner while you keep going
          </div>
        </>
      );
    }
    case "habit": {
      const h = parseHabit(text);
      return (
        <>
          <div className="big">{text.trim()}</div>
          {(h.freq || h.time) && (
            <div className="kv">
              {h.freq && <span><b>Repeats</b>{h.freq}</span>}
              {h.time && <span><b>When</b>{h.time}</span>}
            </div>
          )}
          <div className="sub">Enter saves it — tick it off in History to grow a streak</div>
        </>
      );
    }
    case "weather":
      return <WeatherCard text={text} />;
    case "split": {
      const s = parseSplit(text);
      if (!s) return <div className="sub">Try “split 2400 between 3”…</div>;
      return (
        <>
          <div className="big timerface">
            {s.symbol}{fmtMoney(s.each)} <span className="sub" style={{ fontSize: 16 }}>each</span>
          </div>
          <div className="sub">
            {s.symbol}{fmtMoney(s.amount)} ÷ {s.n} people
            {s.remainder > 0 ? ` · ${s.symbol}${fmtMoney(s.remainder)} left over` : " · exact split"}
          </div>
        </>
      );
    }
    case "convert":
      return <ConvertCard text={text} />;
    case "poll": {
      const opts = parsePollOptions(text);
      if (!opts) return <div className="sub">Options separated by “or”, e.g. “pizza or burgers?”</div>;
      return <PollCard options={opts} />;
    }
    case "calc": {
      const r = parseCalc(text);
      return (
        <>
          <div className="big timerface">{r ?? "…"}</div>
          <div className="sub">Instant math — try “18% of 3450” or “(22*4)+9”</div>
        </>
      );
    }
    case "event": {
      const e = parseEvent(text);
      return (
        <>
          <div className="big">{text.trim()}</div>
          <div className="kv">
            {e.day && <span><b>When</b>{e.day}</span>}
            {e.time && <span><b>Time</b>{e.time}</span>}
            {e.people && <span><b>With</b>{e.people}</span>}
            {e.mode && <span><b>Mode</b>{e.mode}</span>}
          </div>
        </>
      );
    }
    case "reminder": {
      const what = text.replace(/^(please\s+)?remind(er)?\s*me\s*(to|about)?\s*/i, "").trim();
      const rt = parseReminderTime(text);
      return (
        <>
          <div className="big">{what || text.trim()}</div>
          {rt ? (
            <div className="kv">
              <span><b>Fires</b>{rt.label}</span>
            </div>
          ) : (
            <div className="sub">Add a time — “in 30 min”, “at 6pm”, “tomorrow” — and Enter will schedule it for real</div>
          )}
        </>
      );
    }
    case "music":
      return <MusicCard text={text} onSaved={onSaved} />;
    case "search":
      return <SearchCard text={text} />;
    case "note":
      return <div className="sub" style={{ whiteSpace: "pre-wrap" }}>{text.trim()}</div>;
    default:
      return null;
  }
}

/* ── Weather ───────────────────────────────────────────────────── */
type WxResp = {
  place: string; temp: number; feels: number; humidity: number; wind: number;
  hi: number; lo: number; label: string; icon: string; error?: string;
};

function WxIcon({ icon, s = 30 }: { icon: string; s?: number }) {
  const C = { sun: IconSun, cloud: IconCloud, rain: IconCloudRain, snow: IconCloudSnow, storm: IconStorm, fog: IconFog }[icon] ?? IconCloud;
  return <C s={s} />;
}

function WeatherCard({ text }: { text: string }) {
  const place = parseWeatherPlace(text);
  const { data, loading } = useFetch<WxResp>(place ? `/api/weather?place=${encodeURIComponent(place)}` : null);
  if (!place) return <div className="sub">Add a place — “weather in tokyo”.</div>;
  if (loading && !data)
    return (<div><div className="skel" style={{ width: "55%" }} /><div className="skel" style={{ width: "80%" }} /></div>);
  if (!data || data.error || data.temp === undefined)
    return <div className="sub">Couldn&apos;t fetch weather for “{place}” — try a bigger city nearby.</div>;
  return (
    <>
      <div className="big timerface" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "var(--accent)" }}><WxIcon icon={data.icon} /></span>
        {Math.round(data.temp)}°C
      </div>
      <div className="sub">{data.label} in {data.place} · feels {Math.round(data.feels)}°</div>
      <div className="kv">
        <span><b>Hi / Lo</b>{Math.round(data.hi)}° / {Math.round(data.lo)}°</span>
        <span><b>Humidity</b>{data.humidity}%</span>
        <span><b>Wind</b>{Math.round(data.wind)} km/h</span>
      </div>
    </>
  );
}

/* ── Convert ───────────────────────────────────────────────────── */
type FxResp = { rate: number; result: number; error?: string };

function ConvertCard({ text }: { text: string }) {
  const spec = parseConvert(text);
  const fx = useFetch<FxResp>(
    spec?.kind === "currency" ? `/api/fx?from=${spec.from}&to=${spec.to}&amount=${spec.amount}` : null,
  );
  if (!spec) return <div className="sub">Try “5 miles in km” · “72f to c” · “100 usd to inr”</div>;
  if (spec.kind === "unit") {
    return (
      <>
        <div className="big timerface">{fmtMoney(r2(spec.result))} {spec.to}</div>
        <div className="sub">{spec.amount} {spec.from} · {spec.cat}</div>
      </>
    );
  }
  if (fx.loading && !fx.data)
    return (<div><div className="skel" style={{ width: "55%" }} /><div className="skel" style={{ width: "40%" }} /></div>);
  if (!fx.data || fx.data.error)
    return <div className="sub">Live rate unavailable right now — try again in a bit.</div>;
  return (
    <>
      <div className="big timerface">{fmtMoney(r2(fx.data.result))} {spec.to}</div>
      <div className="sub">1 {spec.from} = {r2(fx.data.rate)} {spec.to} · live rate</div>
    </>
  );
}

/* ── Poll ──────────────────────────────────────────────────────── */
function PollCard({ options }: { options: string[] }) {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  return (
    <div className="polls">
      {options.map((o) => {
        const v = votes[o] ?? 0;
        const pct = total ? Math.round((v / total) * 100) : 0;
        return (
          <button key={o} className="pollrow" onClick={() => setVotes((vs) => ({ ...vs, [o]: v + 1 }))}>
            <span className="pollopt">{o}</span>
            <span className="pollbar"><i style={{ width: `${pct}%` }} /></span>
            <span className="pollcount">{v}</span>
          </button>
        );
      })}
      <div className="sub" style={{ marginTop: 6 }}>Tap an option to vote</div>
    </div>
  );
}

/* ── Music — resolved, embedded, queue of saved songs ──────────── */
type MusicResp = { videoId?: string; title?: string; fallback?: boolean };

function MusicCard({ text, onSaved }: { text: string; onSaved?: () => void }) {
  const baseQuery = parseMusic(text);
  const [override, setOverride] = useState<string | null>(null);
  const [savedSongs, setSavedSongs] = useState<DB.SavedCard[]>([]);
  const query = override ?? baseQuery;

  useEffect(() => {
    DB.listSongs()
      .then((r) => setSavedSongs((r ?? []).sort((a, b) => b.ts - a.ts).slice(0, 4)))
      .catch(() => {});
  }, []);

  const res = useFetch<MusicResp>(query.trim().length > 1 ? `/api/music?q=${encodeURIComponent(query)}` : null);

  const saveSong = async () => {
    await DB.putSong({ id: crypto.randomUUID(), intent: "music", text: query, ts: Date.now() }).catch(() => {});
    setSavedSongs((s) => [{ id: crypto.randomUUID(), intent: "music", text: query, ts: Date.now() }, ...s].slice(0, 4));
    onSaved?.();
  };

  if (baseQuery.trim().length < 2) return <div className="sub">Name a song, artist or vibe…</div>;

  return (
    <>
      <div className="big" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22 }}>
        <span style={{ color: "#7a4fd0" }}><IconMusic s={20} /></span>
        {query}
        {res.data?.title && res.data.title.toLowerCase() !== query.toLowerCase() && (
          <span className="sub" style={{ fontSize: 13, fontWeight: 450 }}>· {res.data.title}</span>
        )}
      </div>

      {res.loading && !res.data && (
        <div><div className="skel" style={{ width: "100%", height: 140, borderRadius: 16, marginTop: 10 }} /></div>
      )}

      {res.data?.videoId ? (
        <div className="player">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${res.data.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={res.data.title ?? query}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        !res.loading && (
          <div className="actions">
            <a
              className="btn primary"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
              target="_blank" rel="noreferrer"
            >
              <IconSearch s={13} /> Find on YouTube
            </a>
          </div>
        )
      )}

      <div className="actions">
        <button className="btn" onClick={saveSong}><IconHeart s={13} /> Save song</button>
        <a
          className="btn"
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
          target="_blank" rel="noreferrer"
        >
          <IconExternal s={12} /> Open in YouTube
        </a>
      </div>

      {savedSongs.length > 0 && (
        <div className="chips" style={{ flexWrap: "wrap" }}>
          {savedSongs.map((s) => (
            <button key={s.id} className="chip" onClick={() => setOverride(s.text)}>
              <IconPlay s={10} /> {s.text}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Web search + Ask AI ───────────────────────────────────────── */
type SearchResp = {
  heading: string | null; abstract: string | null; url: string | null;
  links: Array<{ title: string; url: string }>; source: "ddg" | "wiki" | "none";
};
type AskResp = { text?: string; model?: string; error?: string };

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

function SearchCard({ text }: { text: string }) {
  const q = parseSearch(text);
  const { data, loading } = useFetch<SearchResp>(
    q.trim().length > 2 ? `/api/search?q=${encodeURIComponent(q)}` : null,
  );
  const [ask, setAsk] = useState<{ text: string; model: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);

  const askAI = async () => {
    setAsking(true);
    setAskErr(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const j = (await r.json()) as AskResp;
      if (!r.ok || j.error) throw new Error(j.error || `http ${r.status}`);
      setAsk({ text: j.text!, model: j.model ?? "ai" });
    } catch (err) {
      setAskErr(err instanceof Error ? err.message : "failed");
    } finally {
      setAsking(false);
    }
  };

  if (q.trim().length < 3) return <div className="sub">Keep typing your question…</div>;
  if (loading && !data)
    return (
      <div>
        <div className="skel" style={{ width: "65%" }} />
        <div className="skel" style={{ width: "92%" }} />
        <div className="skel" style={{ width: "78%" }} />
      </div>
    );

  return (
    <>
      {data?.abstract ? (
        <>
          <div className="big" style={{ fontSize: 19 }}>{data.heading}</div>
          <div className="sub clamp3" style={{ marginTop: 6 }}>{data.abstract}</div>
        </>
      ) : (
        <div className="big" style={{ fontSize: 19 }}>{q}</div>
      )}

      {ask ? (
        <div className="sub" style={{ marginTop: 8, color: "var(--ink-2)" }}>
          {ask.text}
          <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: 8 }}>· {ask.model}</span>
        </div>
      ) : asking ? (
        <div><div className="skel" style={{ width: "88%" }} /><div className="skel" style={{ width: "60%" }} /></div>
      ) : askErr ? (
        <div className="note2">{askErr}</div>
      ) : null}

      {data?.links?.length ? (
        <div className="linklist">
          {data.links.map((l, i) => (
            <a key={i} className="linkrow" href={l.url} target="_blank" rel="noreferrer">
              <span className="ltitle">{l.title}</span>
              <span className="lhost">{host(l.url)}</span>
            </a>
          ))}
        </div>
      ) : null}

      <div className="actions">
        {!ask && !asking && (
          <button className="btn primary" onClick={askAI}>
            <IconSparkles s={13} /> Ask AI
          </button>
        )}
        <a className="btn" href={`https://duckduckgo.com/?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">
          <IconExternal s={12} /> Full results
        </a>
        {data?.url && (
          <a className="btn" href={data.url} target="_blank" rel="noreferrer">
            <IconExternal s={12} /> Source
          </a>
        )}
      </div>
    </>
  );
}
