"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { QuestionDef } from "@/lib/jev/questions";
import * as DB from "@/lib/db";
import { IconBookmark, IconCopy, IconDownload, IconPlay } from "@/components/icons";

type GenResp = {
  source: "pack" | "llm" | "llm-repaired" | "template";
  name: string;
  description?: string;
  questions: Record<string, QuestionDef>;
  note?: string;
  packId?: string;
  meta?: { model: string; ms: number };
  cached?: boolean;
};

type DecideResp = {
  source: "jev" | "sim";
  model: string;
  latencyMs: number;
  answers: Record<string, {
    choice?: string;
    confidence?: number;
    probabilities?: Record<string, number>;
    score?: number;
    noul?: number | boolean;
  }>;
};

type Provider = "auto" | "ollama" | "groq" | "gemini";

const SRC_LABEL: Record<string, string> = {
  pack: "task pack",
  llm: "model",
  "llm-repaired": "model · repaired",
  template: "template",
  jev: "real jev",
  sim: "simulated",
};

const EXAMPLES = [
  "triage my gmail inbox",
  "moderate comments on my forum",
  "I want to sort job applications by fit and team",
  "understand vague music requests like play something chill",
  "rate my gym selfies for progress",
];

export default function StudioClient() {
  const [goal, setGoal] = useState("");
  const [sample, setSample] = useState("");
  const [provider, setProvider] = useState<Provider>("auto");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenResp | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<DB.SavedSchema[]>([]);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    setProvider((localStorage.getItem("jev-translator") as Provider) || "auto");
    refreshSaved();
  }, []);

  const toast2 = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const refreshSaved = useCallback(() => {
    DB.listSchemas()
      .then((r) => setSaved((r ?? []).sort((a, b) => b.ts - a.ts)))
      .catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    if (goal.trim().length < 6 || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/schema/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, sample: sample || undefined, provider }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `http ${res.status}`);
      setResult((await res.json()) as GenResp);
    } catch (err) {
      toast2(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [goal, sample, provider, busy, toast2]);

  const saveIt = useCallback(async () => {
    if (!result) return;
    await DB.saveSchema({
      id: crypto.randomUUID(),
      name: result.name,
      description: result.description,
      source: result.source,
      questions: result.questions,
      ts: Date.now(),
    }).catch(() => {});
    refreshSaved();
    toast2("Schema saved ✓");
  }, [result, refreshSaved, toast2]);

  const copyPayload = useCallback(async () => {
    if (!result) return;
    const payload = {
      state: { text: "<the text to classify>" },
      model: "jev-latest",
      questions: result.questions,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast2("System One payload copied ✓");
  }, [result, toast2]);

  const pickProvider = (p: Provider) => {
    setProvider(p);
    localStorage.setItem("jev-translator", p);
  };

  return (
    <div style={{ width: "min(860px, 100%)" }}>
      {/* ── Step 1 · goal ── */}
      <section className="sect">
        <h2 className="h2">1 · Describe the decision in plain English</h2>
        <textarea
          className="field"
          rows={3}
          placeholder="e.g. sort my support tickets by urgency and product area"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <textarea
          className="field"
          style={{ marginTop: 8 }}
          rows={2}
          placeholder="(optional) paste a sample input — helps the model design better questions"
          value={sample}
          onChange={(e) => setSample(e.target.value)}
        />
        <div className="chips" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex) => (
            <button key={ex} className="chip" onClick={() => setGoal(ex)}>
              {ex}
            </button>
          ))}
        </div>

        <div className="prow" style={{ marginTop: 14 }}>
          <span>Translator</span>
          <div className="segs" style={{ width: 300 }}>
            {(["auto", "ollama", "groq", "gemini"] as Provider[]).map((p) => (
              <button
                key={p}
                className={`seg ${provider === p ? "on" : ""}`}
                onClick={() => pickProvider(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="note2">
          auto tries a free task pack first (instant), then Ollama{" "}
          <code>qwen3:0.6b</code> on your machine, then any free API keys.{" "}
          <button className="chip" style={{ padding: "1px 8px" }} onClick={() => setShowKeys((s) => !s)}>
            {showKeys ? "hide keys ▴" : "keys ▾"}
          </button>
        </div>
        {showKeys && <KeyBox onSaved={() => toast2("Key saved ✓")} />}

        <div className="actions">
          <button
            className="btn primary"
            onClick={generate}
            disabled={busy || goal.trim().length < 6}
          >
            {busy ? "Generating… (model may be loading)" : "Generate schema →"}
          </button>
        </div>
      </section>

      {/* ── Step 2 · result ── */}
      <AnimatePresence>
        {result && (
          <motion.section
            className="sect"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="h2">
              2 · Your Jev question schema{" "}
              <span className="badge src">{SRC_LABEL[result.source] ?? result.source}</span>
              {result.meta && (
                <span className="badge src">
                  {result.meta.model} · {result.meta.ms}ms
                </span>
              )}
              {result.cached && <span className="badge src">cached</span>}
            </h2>
            <div className="qcard">
              <div className="qhead" style={{ fontSize: 15, fontWeight: 600 }}>
                {result.name}
              </div>
              {result.description && <div className="note2">{result.description}</div>}
              {result.note && <div className="note2">{result.note}</div>}
            </div>
            {Object.entries(result.questions).map(([id, def]) => (
              <div className="qcard" key={id}>
                <div className="qhead">
                  <span className="mono">{id}</span>
                  <span className={`badge ${def.type}`}>{def.type}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 14 }}>{def.question}</div>
                {def.type === "choice" && (
                  <div className="optchips">
                    {Object.entries(def.options).map(([k, v]) => (
                      <span key={k} className="optchip" title={v}>
                        {k}
                      </span>
                    ))}
                  </div>
                )}
                {def.type === "score" && (
                  <div className="optchips">
                    {def.scale.map((s, i) => (
                      <span key={i} className="optchip">
                        {i + 1} · {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="actions">
              <button className="btn primary" onClick={saveIt}>
                <IconBookmark s={13} /> Save schema
              </button>
              <button className="btn" onClick={copyPayload}>
                <IconCopy s={13} /> Copy API payload
              </button>
              <button
                className="btn"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(result.questions, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${result.name.replace(/\s+/g, "-").toLowerCase()}.json`;
                  a.click();
                }}
              >
                <IconDownload s={13} /> Export JSON
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Step 3 · playground ── */}
      {result && <Playground questions={result.questions} />}

      {/* ── My schemas ── */}
      {saved.length > 0 && (
        <section className="sect">
          <h2 className="h2">My schemas</h2>
          {saved.map((s) => (
            <div className="sitem" key={s.id}>
              <span className="tag">{Object.keys(s.questions).length}q</span>
              <span className="txt" title={s.description}>
                {s.name}
              </span>
              <span className="val" style={{ color: "var(--muted)", fontSize: 11 }}>
                {s.source}
              </span>
              <button className="del" onClick={() => DB.deleteSchema(s.id).then(refreshSaved)}>
                ×
              </button>
            </div>
          ))}
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Playground({ questions }: { questions: Record<string, QuestionDef> }) {
  const [text, setText] = useState("");
  const [out, setOut] = useState<DecideResp | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: { text }, questions }),
      });
      if (!res.ok) throw new Error(`http ${res.status}`);
      setOut((await res.json()) as DecideResp);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="sect">
      <h2 className="h2">3 · Try it</h2>
      <textarea
        className="field"
        rows={2}
        placeholder="Paste some text the schema should decide on…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="actions">
        <button className="btn primary" onClick={run} disabled={busy || !text.trim()}>
          {busy ? "Running…" : <><IconPlay s={12} /> Run</>}
        </button>
        {out && (
          <span className="badge src">
            {SRC_LABEL[out.source]} · {out.model} · {out.latencyMs}ms
          </span>
        )}
      </div>
      {out && (
        <div className="qcard" style={{ marginTop: 12 }}>
          <div className="ans">
            {Object.entries(out.answers).map(([id, a]) => {
              const q = questions[id];
              const conf = Math.round((a.confidence ?? 0.5) * 100);
              let value = "";
              if (a.choice !== undefined) value = `→ ${a.choice}`;
              else if (a.score !== undefined) value = `→ ${Number(a.score) + 1} / ${q?.type === "score" ? q.scale.length : "?"} (${q?.type === "score" ? q.scale[Number(a.score)] : ""})`;
              else if (a.noul !== undefined)
                value = `→ ${typeof a.noul === "boolean" ? (a.noul ? "yes" : "no") : `${Math.round(Number(a.noul) * 100)}% yes`}`;
              return (
                <div className="ansrow" key={id}>
                  <span className="q">
                    <b className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{id}</b>{" "}
                    {q?.question} <b>{value}</b>
                  </span>
                  <span className="confbar" title={`confidence ${conf}%`}>
                    <i style={{ width: `${conf}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
          {out.source === "sim" && (
            <div className="note2">
              🟡 Simulated locally (keyword heuristics). Add a TypeSafe key in Settings
              for real Jev answers.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function KeyBox({ onSaved }: { onSaved: () => void }) {
  const [groq, setGroq] = useState("");
  const [gemini, setGemini] = useState("");

  const save = async (field: "groqKey" | "geminiKey", value: string) => {
    if (!value.trim()) return;
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value.trim() }),
    });
    if (field === "groqKey") setGroq("");
    else setGemini("");
    onSaved();
  };

  return (
    <div className="qcard" style={{ marginTop: 10 }}>
      <div className="prow" style={{ display: "block" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Free online translator keys (optional — Ollama needs none):
        </span>
      </div>
      <div className="prow">
        <input
          type="password"
          placeholder="Groq API key (console.groq.com — free)"
          value={groq}
          onChange={(e) => setGroq(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={() => save("groqKey", groq)} disabled={!groq.trim()}>
          Save
        </button>
      </div>
      <div className="prow">
        <input
          type="password"
          placeholder="Gemini API key (aistudio.google.com — free)"
          value={gemini}
          onChange={(e) => setGemini(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={() => save("geminiKey", gemini)} disabled={!gemini.trim()}>
          Save
        </button>
      </div>
    </div>
  );
}
