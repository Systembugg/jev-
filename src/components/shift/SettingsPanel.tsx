"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconSparkles, IconTrash } from "@/components/icons";

type Shortcut = { k: string; u: string };
const SC_KEY = "jev-shortcuts";

function ShortcutsEditor() {
  const [items, setItems] = useState<Shortcut[]>([]);
  const [k, setK] = useState("");
  const [u, setU] = useState("");

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(SC_KEY) || "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const persist = (next: Shortcut[]) => {
    setItems(next);
    try {
      localStorage.setItem(SC_KEY, JSON.stringify(next));
    } catch {
      /* full */
    }
  };

  const add = () => {
    const key = k.trim();
    const url = u.trim();
    if (!key || !url) return;
    persist([...items, { k: key, u: /^https?:\/\//i.test(url) ? url : `https://${url}` }]);
    setK("");
    setU("");
  };

  return (
    <div className="prow" style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 6 }}>Shortcuts</span>
      {items.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12.5 }}>
          <b style={{ minWidth: 90, fontWeight: 550 }}>{s.k}</b>
          <span style={{ flex: 1, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.u}</span>
          <button className="del" onClick={() => persist(items.filter((_, j) => j !== i))} aria-label="Delete shortcut">
            <IconTrash s={12} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input type="text" placeholder="trigger e.g. gym" value={k} onChange={(e) => setK(e.target.value)} style={{ width: "38%" }} />
        <input type="text" placeholder="url" value={u} onChange={(e) => setU(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" onClick={add} disabled={!k.trim() || !u.trim()} aria-label="Add shortcut">
          <IconPlus s={13} />
        </button>
      </div>
      <div className="note">
        Type the exact trigger and the card offers to open that URL (Enter works).
      </div>
    </div>
  );
}

type Status = {
  model: string;
  endpoint: string;
  online: boolean;
  source: "env" | "cookie" | null;
  forcedOffline: boolean;
  ollamaHost: string;
};

type Mode = "auto" | "online" | "offline";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [personalize, setPersonalize] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
    setMode((localStorage.getItem("jev-mode") as Mode) || "auto");
    setPersonalize(localStorage.getItem("jev-personalize") !== "0");
  }, [refresh]);

  const pick = (m: Mode) => {
    setMode(m);
    localStorage.setItem("jev-mode", m);
  };

  const saveKey = async () => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setMsg(res.ok ? "Key saved (server-only cookie) ✓" : (await res.json()).error);
    if (res.ok) {
      setKey("");
      refresh();
    }
  };

  const clearKey = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    setMsg("Key cleared");
    refresh();
  };

  return (
    <div className="panel">
      <h4>Connection</h4>

      <div className="prow">
        <span>Status</span>
        <span className="val">
          {status
            ? status.forcedOffline
              ? "offline (forced)"
              : status.online
                ? `online via ${status.source}`
                : "offline mode"
            : "…"}
        </span>
      </div>
      <div className="prow">
        <span>Model</span>
        <span className="val">{status?.model ?? "jev-latest"}</span>
      </div>

      <div className="prow" style={{ display: "block" }}>
        <span style={{ display: "block", marginBottom: 6 }}>Classifier mode</span>
        <div className="segs">
          {(["auto", "online", "offline"] as Mode[]).map((m) => (
            <button
              key={m}
              className={`seg ${mode === m ? "on" : ""}`}
              onClick={() => pick(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="note">
          Auto = use the TypeSafe API when a key exists, silently fall back to the
          built-in offline classifier otherwise. The offline classifier has the same
          output shape — the UI never flickers.
        </div>
      </div>

      <div className="prow" style={{ display: "block" }}>
        <span style={{ display: "block", marginBottom: 6 }}>TypeSafe API key</span>
        <input
          type="password"
          placeholder="sk-typesafe-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={saveKey} disabled={!key.trim()}>
            Save key
          </button>
          {status?.source === "cookie" && (
            <button className="btn" onClick={clearKey}>
              Clear
            </button>
          )}
        </div>
        {msg && <div className="note">{msg}</div>}
        <div className="note">
          Stored as an httpOnly cookie — the key is only read on the server and never
          ships to the browser bundle. Server-side env <code>TYPESAFE_API_KEY</code>{" "}
          always wins.
        </div>
      </div>

      <div className="prow">
        <span>Personalize with my data</span>
        <input
          type="checkbox"
          checked={personalize}
          onChange={(e) => {
            setPersonalize(e.target.checked);
            localStorage.setItem("jev-personalize", e.target.checked ? "1" : "0");
          }}
        />
      </div>
      <div className="note">
        Ships a compact Context Pack (timezone + a few saved songs / history titles)
        inside the model&apos;s state. In offline mode nothing leaves this device.
      </div>

      <div className="prow">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--accent)" }}><IconSparkles s={13} /></span> Schema Studio
        </span>
        <Link href="/studio" className="link" style={{ fontSize: 13 }} onClick={onClose}>
          open
        </Link>
      </div>

      <ShortcutsEditor />

      <div className="actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
