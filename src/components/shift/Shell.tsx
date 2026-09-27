"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  INTENT_KEYS,
  INTENT_LABEL,
  noneResult,
  type IntentKey,
  type IntentResult,
} from "@/lib/jev/types";
import { applyCalm, initialCalm, type Calm } from "@/lib/calm";
import { getContextPack, noteRecent } from "@/lib/context/pack";
import { fmtSecs, parseReminderTime, parseTimer } from "@/lib/parse";
import * as DB from "@/lib/db";
import CardBody from "./CardBody";
import SettingsPanel from "./SettingsPanel";
import {
  IconCheck, IconExternal, IconGear, IconLink, IconPause, IconPlay, IconTrash, IconX,
} from "@/components/icons";

const DEBOUNCE_MS = 280;
const spring = { type: "spring", bounce: 0.18, duration: 0.5 } as const;

const GHOSTS = [
  "dinner with priya friday 8pm on zoom",
  "buy milk, eggs, bread and coffee",
  "25 min focus",
  "weather in mumbai",
  "play daft punk get lucky",
  "split 2400 between 3",
  "5 miles in km",
  "100 usd to inr",
  "gym 3x a week",
  "pizza or burgers for friday?",
  "remind me in 10 min stretch",
];

/* Inline critical styles — cache-proof widgets */
const INK = "#1a1a19";
const MUTED = "#706e68";
const LINE = "#e8e7e4";
const ACCENT = "#3b5bdb";
const ACCENT_SOFT = "#eef1fd";
const SHADOW_LIFT = "0 1px 2px rgb(26 26 25 / 0.04), 0 8px 24px -6px rgb(26 26 25 / 0.08)";
const SHADOW_FLOAT = "0 2px 4px rgb(26 26 25 / 0.04), 0 20px 48px -12px rgb(26 26 25 / 0.14)";

const S = {
  inwrap: { flex: 1, minWidth: 0, display: "grid", alignItems: "center" } as CSSProperties,
  field: { gridArea: "1/1", minWidth: 0 } as CSSProperties,
  ghost: {
    gridArea: "1/1", minWidth: 0, fontSize: "clamp(17px, 2.4vw, 20px)", fontWeight: 450,
    color: "#b3b1aa", letterSpacing: "-0.01em", pointerEvents: "none",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  } as CSSProperties,
  pillWrap: { position: "fixed", left: 16, bottom: 14, display: "flex", flexDirection: "column", gap: 8, zIndex: 40 } as CSSProperties,
  pillBox: {
    display: "flex", alignItems: "center", gap: 10, background: "#fff",
    border: `1px solid ${LINE}`, borderRadius: 999, padding: "7px 12px 7px 9px", boxShadow: SHADOW_LIFT,
  } as CSSProperties,
  pillTime: { fontWeight: 650, fontSize: 13.5, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 } as CSSProperties,
  pillLbl: { fontSize: 11, color: MUTED, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as CSSProperties,
  pillBtn: {
    border: 0, background: "none", color: MUTED, cursor: "pointer", padding: "3px 5px",
    borderRadius: 7, lineHeight: 1, display: "inline-grid", placeItems: "center",
  } as CSSProperties,
  hud: {
    position: "fixed", right: 16, bottom: 14, display: "flex", alignItems: "center", gap: 7,
    fontSize: 12, color: MUTED, background: "rgba(255,255,255,0.8)",
    border: `1px solid ${LINE}`, borderRadius: 999, padding: "5px 12px", backdropFilter: "blur(6px)",
  } as CSSProperties,
  toast: {
    position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)",
    background: INK, color: "#fff", borderRadius: 20, padding: "9px 18px", fontSize: 13,
    boxShadow: SHADOW_FLOAT, zIndex: 50, display: "flex", alignItems: "center", gap: 8,
  } as CSSProperties,
};

type RunningTimer = {
  id: string; label: string; totalSec: number;
  endsAt: number | null; leftSec: number; done: boolean; finishedAt?: number;
};
type Reminder = { id: string; text: string; at: number };
type Shortcut = { k: string; u: string };
type Streak = { count: number; last: string };

const dayKey = (t: number) => new Date(t).toDateString();

function loadLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}
function saveLS(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* full */ }
}

function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [880, 1174.66, 1567.98].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t0 = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.7);
    });
    setTimeout(() => ctx.close().catch(() => {}), 2200);
  } catch { /* blocked */ }
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted")
      new Notification(title, { body });
  } catch { /* unsupported */ }
}

function askNotifyPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission().catch(() => {});
  } catch { /* ignore */ }
}

const b64encode = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64decode = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export default function Shell() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<IntentResult | null>(null);
  const [visible, setVisible] = useState<IntentKey>("none");
  const [saved, setSaved] = useState<DB.SavedCard[]>([]);
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [shortcutHit, setShortcutHit] = useState<Shortcut | null>(null);
  const [streaks, setStreaks] = useState<Record<string, Streak>>({});
  const [shared, setShared] = useState<{ i: IntentKey; t: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ghostIndex, setGhostIndex] = useState(0);
  const calmRef = useRef<Calm>(initialCalm());
  const abortRef = useRef<AbortController | null>(null);

  const notify2 = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1900);
  }, []);

  const refreshSaved = useCallback(() => {
    DB.listCards()
      .then((r) => setSaved((r ?? []).slice().sort((a, b) => b.ts - a.ts)))
      .catch(() => {});
  }, []);

  useEffect(refreshSaved, [refreshSaved]);

  // load persistent stores + inbound shared card
  useEffect(() => {
    setReminders(loadLS<Reminder[]>("jev-reminders", []));
    setShortcuts(loadLS<Shortcut[]>("jev-shortcuts", []));
    setStreaks(loadLS<Record<string, Streak>>("jev-streaks", {}));
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) {
      try {
        const p = JSON.parse(b64decode(c));
        if (INTENT_KEYS.includes(p.i) && typeof p.t === "string" && p.t.length < 2000)
          setShared({ i: p.i, t: p.t });
      } catch { /* bad link */ }
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setGhostIndex((i) => (i + 1) % GHOSTS.length), 2800);
    return () => clearInterval(id);
  }, []);

  // ── reminder watcher ──────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const due = reminders.filter((r) => r.at <= now);
      if (!due.length) return;
      const rest = reminders.filter((r) => r.at > now);
      setReminders(rest);
      saveLS("jev-reminders", rest);
      due.forEach((r) => {
        chime();
        notify("Reminder", r.text);
        notify2(`Reminder: ${r.text}`);
        DB.saveCard({ id: crypto.randomUUID(), intent: "reminder", text: `${r.text} (done)`, ts: now }).catch(() => {});
        refreshSaved();
      });
    }, 5000);
    return () => clearInterval(id);
  }, [reminders, notify2, refreshSaved]);

  // ── intent classification ─────────────────────────────────────
  const run = useCallback(async (t: string) => {
    abortRef.current?.abort();

    // user shortcuts: exact trigger match wins, no model call needed
    const hit = shortcuts.find((s) => s.k.trim().toLowerCase() === t.trim().toLowerCase());
    if (hit && t.trim().length >= 2) {
      setShortcutHit(hit);
      setResult(null);
      return;
    }
    setShortcutHit(null);

    if (t.trim().length < 2) {
      calmRef.current = applyCalm(calmRef.current, noneResult());
      setVisible(calmRef.current.current);
      setResult(null);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const personalize = localStorage.getItem("jev-personalize") !== "0";
    const mode = localStorage.getItem("jev-mode") || "auto";
    const context = personalize ? await getContextPack().catch(() => undefined) : undefined;
    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-shift-mode": mode },
        body: JSON.stringify({ text: t, context }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`intent ${res.status}`);
      const r = (await res.json()) as IntentResult;
      calmRef.current = applyCalm(calmRef.current, r);
      setVisible(calmRef.current.current);
      setResult(r);
      if (r.intent.value !== "none") noteRecent(r.intent.value);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        /* keep last good card */
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    const id = setTimeout(() => run(text), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, run]);

  // ── running timers heartbeat ──────────────────────────────────
  useEffect(() => {
    if (timers.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setTimers((ts) =>
        ts
          .map((t) => {
            if (t.done || t.endsAt === null) return t;
            const left = Math.max(0, Math.ceil((t.endsAt - now) / 1000));
            if (left <= 0) {
              chime();
              notify("Timer done", t.label);
              DB.saveCard({ id: crypto.randomUUID(), intent: "timer", text: `${t.label} (done)`, ts: now }).catch(() => {});
              refreshSaved();
              return { ...t, leftSec: 0, done: true, finishedAt: now };
            }
            return left !== t.leftSec ? { ...t, leftSec: left } : t;
          })
          .filter((t) => !t.done || now - (t.finishedAt ?? now) < 12_000),
      );
    }, 500);
    return () => clearInterval(id);
  }, [timers.length, refreshSaved]);

  const startTimer = useCallback((label: string, seconds: number) => {
    askNotifyPermission();
    setTimers((ts) => [
      ...ts,
      { id: crypto.randomUUID(), label, totalSec: seconds, endsAt: Date.now() + seconds * 1000, leftSec: seconds, done: false },
    ]);
  }, []);

  const pauseTimer = useCallback((id: string) => {
    setTimers((ts) =>
      ts.map((t) =>
        t.id === id && t.endsAt !== null && !t.done
          ? { ...t, endsAt: null, leftSec: Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000)) }
          : t,
      ),
    );
  }, []);
  const resumeTimer = useCallback((id: string) => {
    setTimers((ts) =>
      ts.map((t) => (t.id === id && t.endsAt === null && !t.done ? { ...t, endsAt: Date.now() + t.leftSec * 1000 } : t)),
    );
  }, []);
  const dismissTimer = useCallback((id: string) => {
    setTimers((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const reset = useCallback(() => {
    setText("");
    setShortcutHit(null);
    calmRef.current = initialCalm();
    setVisible("none");
    setResult(null);
  }, []);

  // ── Enter: act ────────────────────────────────────────────────
  const save = useCallback(async () => {
    const t = text.trim();
    if (!t) return;

    if (shortcutHit) {
      window.open(shortcutHit.u, "_blank", "noopener");
      reset();
      return;
    }
    if (visible === "none") return;

    if (visible === "timer") {
      const spec = parseTimer(t);
      if (spec) {
        startTimer(t, spec.seconds);
        notify2("Timer started — it lives bottom-left");
        reset();
        return;
      }
    }

    if (visible === "reminder") {
      const rt = parseReminderTime(t);
      askNotifyPermission();
      if (rt) {
        const next = [...reminders, { id: crypto.randomUUID(), text: t, at: rt.at }];
        setReminders(next);
        saveLS("jev-reminders", next);
        notify2(`Reminder set — fires ${rt.label}`);
      }
    }

    try {
      await DB.saveCard({ id: crypto.randomUUID(), intent: visible, text: t, ts: Date.now() });
      refreshSaved();
    } catch { /* idb */ }
    if (visible !== "reminder" || !parseReminderTime(t)) notify2("Saved");
    reset();
  }, [text, visible, shortcutHit, reminders, refreshSaved, reset, startTimer, notify2]);

  // ── history row actions ───────────────────────────────────────
  const shareCard = useCallback((c: DB.SavedCard) => {
    const url = `${window.location.origin}/?c=${b64encode(JSON.stringify({ i: c.intent, t: c.text }))}`;
    navigator.clipboard.writeText(url).then(() => notify2("Share link copied"));
  }, [notify2]);

  const toggleStreak = useCallback((id: string) => {
    const today = dayKey(Date.now());
    const next = { ...streaks };
    const cur = next[id] ?? { count: 0, last: "" };
    next[id] =
      cur.last === today ? { count: Math.max(0, cur.count - 1), last: "" } : { count: cur.count + 1, last: today };
    setStreaks(next);
    saveLS("jev-streaks", next);
  }, [streaks]);

  const challenger =
    calmRef.current.challenger && calmRef.current.challenger !== visible && calmRef.current.challenger !== "none"
      ? calmRef.current.challenger
      : null;

  return (
    <section className="shell">
      {shared && (
        <motion.div
          className="frame"
          style={{ marginBottom: 14 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <div className="cardtitle" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="tag" style={{ color: ACCENT, background: ACCENT_SOFT, borderRadius: 6, padding: "3px 7px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>shared</span>
              <span style={{ color: MUTED }}>from a link</span>
            </span>
            <button
              className="iconbtn"
              onClick={() => {
                setShared(null);
                window.history.replaceState(null, "", window.location.pathname);
              }}
              aria-label="Dismiss"
            >
              <IconX s={13} />
            </button>
          </div>
          <CardBody intent={shared.i} text={shared.t} />
        </motion.div>
      )}

      <motion.div layout className="frame" transition={spring}>
        <div className="inrow">
          <div className="inwrap" style={S.inwrap}>
            <input
              autoFocus
              value={text}
              style={S.field}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") reset();
              }}
              aria-label="Type anything"
            />
            {text === "" && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={ghostIndex}
                  className="ghost"
                  style={S.ghost}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {GHOSTS[ghostIndex]}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          <button className="iconbtn" title="Connection & settings" onClick={() => setPanelOpen((p) => !p)} aria-label="Settings">
            <IconGear s={15} />
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {shortcutHit ? (
            <motion.div
              key="shortcut"
              className="cardpad"
              initial={{ opacity: 0, y: 6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="cardtitle"><span style={{ color: ACCENT }}><IconExternal s={12} /></span>Shortcut</div>
              <div className="big" style={{ fontSize: 22 }}>{shortcutHit.k}</div>
              <div className="sub clamp3">{shortcutHit.u}</div>
              <div className="actions">
                <button className="btn primary" onClick={() => { window.open(shortcutHit.u, "_blank", "noopener"); reset(); }}>
                  <IconExternal s={12} /> Open — Enter works too
                </button>
              </div>
            </motion.div>
          ) : (
            visible !== "none" && (
              <motion.div
                key={visible}
                className="cardpad"
                initial={{ opacity: 0, y: 6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.985 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <CardBody intent={visible} text={text} onSaved={refreshSaved} />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </motion.div>

      {challenger && !shortcutHit && (
        <div className="chips">
          <button
            className="chip"
            onClick={() => {
              calmRef.current = { current: challenger, challenger: null, wins: 0 };
              setVisible(challenger);
            }}
          >
            Did you mean: {INTENT_LABEL[challenger]}?
          </button>
        </div>
      )}

      {panelOpen && <SettingsPanel onClose={() => setPanelOpen(false)} />}

      {saved.length > 0 && (
        <motion.div layout className="saved" transition={spring}>
          <h3>History</h3>
          <AnimatePresence initial={false}>
            {saved.map((c) => {
              const streak = streaks[c.id];
              return (
                <motion.div
                  key={c.id}
                  className="sitem"
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                >
                  <span className="tag">{c.intent}</span>
                  {c.intent === "habit" && (
                    <button
                      className={`habitcheck ${streak?.last === dayKey(Date.now()) ? "on" : ""}`}
                      title={streak?.last === dayKey(Date.now()) ? "Done today — tap to undo" : "Mark done today"}
                      onClick={() => toggleStreak(c.id)}
                    >
                      <IconCheck s={11} />
                    </button>
                  )}
                  <span className="txt" title={c.text}>{c.text}</span>
                  {c.intent === "habit" && (streak?.count ?? 0) > 0 && (
                    <span className="streakbadge" title="day streak">{streak.count}d</span>
                  )}
                  <button className="del" title="Copy share link" onClick={() => shareCard(c)} aria-label="Share">
                    <IconLink s={13} />
                  </button>
                  <button className="del" onClick={() => DB.deleteCard(c.id).then(refreshSaved)} aria-label="Delete">
                    <IconTrash s={13} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* running timers — inline-styled, cache-proof */}
      <div style={S.pillWrap}>
        <AnimatePresence>
          {timers.map((t) => (
            <motion.div
              key={t.id}
              layout
              style={{ ...S.pillBox, borderColor: t.done ? ACCENT : LINE }}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
            >
              {t.done ? (
                <span style={{ width: 20, height: 20, display: "grid", placeItems: "center", color: ACCENT }}>
                  <IconCheck s={13} />
                </span>
              ) : (
                <Ring progress={t.totalSec ? 1 - t.leftSec / t.totalSec : 0} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={S.pillTime}>{t.done ? "Done" : fmtSecs(t.leftSec)}</div>
                <div style={S.pillLbl} title={t.label}>{t.label}</div>
              </div>
              {!t.done &&
                (t.endsAt === null ? (
                  <button style={S.pillBtn} onClick={() => resumeTimer(t.id)} aria-label="Resume"><IconPlay s={12} /></button>
                ) : (
                  <button style={S.pillBtn} onClick={() => pauseTimer(t.id)} aria-label="Pause"><IconPause s={12} /></button>
                ))}
              <button style={S.pillBtn} onClick={() => dismissTimer(t.id)} aria-label="Dismiss"><IconX s={12} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Hud result={result} />
      {toast && <div style={S.toast}>{toast}</div>}
    </section>
  );
}

function Ring({ progress }: { progress: number }) {
  const R = 8;
  const C = 2 * Math.PI * R;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ display: "block" }} aria-hidden>
      <circle cx="10" cy="10" r={R} fill="none" stroke={LINE} strokeWidth="2.5" />
      <circle
        cx="10" cy="10" r={R} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - Math.min(1, Math.max(0, progress)))}
        transform="rotate(-90 10 10)"
        style={{ transition: "stroke-dashoffset 0.5s linear" }}
      />
    </svg>
  );
}

function Hud({ result }: { result: IntentResult | null }) {
  if (!result) return null;
  const color = result.source === "error" ? "#e03131" : result.source === "offline" ? "#e8590c" : "#2f9e44";
  return (
    <div style={S.hud} title="classifier status">
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span>
        {result.model} · {result.latencyMs}ms
        {result.cached ? " · cached" : ""}
      </span>
    </div>
  );
}
