# jev/play

**One input that becomes what you mean** — plus a studio that turns plain English into
[Jev](https://typesafe.ai) (TypeSafe AI System One) payloads, so regular people never
see a JSON payload.

You type normal text. A fast decision model (TypeSafe **Jev**, or a built-in offline
classifier with the same output shape) figures out *what kind of thing* you're making —
an event, checklist, timer, poll, song… — and the input **morphs into that tool** with
one smooth spring animation. **The model decides, code computes**: every value (dates,
amounts, units, math) is parsed deterministically, never hallucinated by a model.

```
25 min focus          → live countdown timer (starts on Enter, ticks in the corner)
split 2400 between 3  → ₹800 each
buy milk, eggs, bread → checklist
weather in mumbai     → live weather card   ·   100 usd to inr → live rate
play daft punk        → embedded music player + saved-songs queue
```

---

## What's inside (feature map)

| Area | What it does |
|---|---|
| **Morphing shell** | One centered input. It morphs into the right card with a shared-spring Motion animation; a hysteresis "calm" reducer stops flicker while you type. |
| **13 intents** | event · reminder · todo · timer · habit · weather · split · convert · calc · poll · music · search · note |
| **Live timers** | Enter starts a real countdown → pill widget bottom-left (progress ring, pause/resume/dismiss, chime + OS notification when done) |
| **Real reminders** | `remind me in 30 min stretch` / `at 6pm` / `tomorrow` → schedules, survives refresh, fires with chime + notification |
| **Free integrations** | Weather (Open-Meteo), FX rates (Frankfurter), web answers (DuckDuckGo + Wikipedia) — **zero API keys** |
| **Music player** | Song name → resolved via Piped/Invidious (keyless) → **official YouTube embed** in the card; ♥ save to a queue; queue chips re-play saved songs |
| **Ask AI** | One tap on any search → short answer from **Ollama (local GPU) → Groq → Gemini**, whichever is available |
| **History** | Everything saved lives in IndexedDB: search, delete, copy a **share link** (`?c=…` URL restores the card), habit **streaks** |
| **Shortcuts** | Exact trigger → URL (e.g. type `gym`, get an open-offer). Managed in Settings |
| **Jev connection** | Auto / Online / Offline toggle; TypeSafe key stored server-side (httpOnly cookie or env); **silent fallback** so the UI never flashes |
| **Context Pack** | A compact, privacy-gated snapshot of your local data bank (saved songs, recent intents, timezone) ships inside the model's `state` so results personalise. Offline mode: nothing leaves the device |
| **Schema Studio** (`/studio`) | Plain-English goal → a full Jev question schema (Choice/Score/Noul). Cascade: **task packs** (instant) → **Ollama qwen3:0.6b** (grammar-locked JSON, `keep_alive:0`) → Groq → Gemini → template. Zod-validated, one auto-repair, cached. Playground runs real Jev or a clearly-labelled simulator; save/export/copy payloads |
| **Design rules** | No emojis — a 26-piece lucide-style SVG icon set; one accent, one radius scale (28→20→16→12), rest→lift→float shadows, Geist font, `prefers-reduced-motion` respected |

---

## Architecture

```
keystroke ─ debounce 280ms ─ POST /api/intent ─┬─ TypeSafe key? → Jev SystemOne API
                                                └─ else → offline classifier (same shape)
                    │
        IntentResult { intent, confidence, signals }
                    │
        calm reducer (champion/challenger hysteresis)
                    │
        visible card ← deterministic parsers (dates, units, split, math…)
                    │
        Motion morph (AnimatePresence popLayout + one spring)
```

- **Jev decides, code computes.** The classifier picks *which* card and reads *signals*
  (urgency, question-ness, recurrence). Code extracts every *value*.
- **Offline-first.** Without a key, a deterministic keyword classifier produces the
  identical output shape, and any API error silently falls back to it.
- **Cache-proof widgets.** Timer pills/HUD/toasts carry critical styles inline, so a
  stale stylesheet can never unstyle them.

## File map

```
src/
├─ app/
│  ├─ page.tsx                  home — brand + morphing shell (nothing else)
│  ├─ layout.tsx                Geist font + metadata
│  ├─ globals.css               token system (ported from shapeshift's tokens) + all styles
│  ├─ studio/page.tsx           Schema Studio page
│  └─ api/
│     ├─ intent/route.ts        classifier: key → Jev; else offline mock; LRU cache; silent fallback
│     ├─ decide/route.ts        generic runner for ANY question schema (Studio playground)
│     ├─ schema/generate/       NL goal → question schema (packs → Ollama → Groq → Gemini → template)
│     ├─ search/route.ts        DuckDuckGo instant answer + Wikipedia fallback
│     ├─ weather/route.ts       Open-Meteo geocode + current weather (15-min cache)
│     ├─ fx/route.ts            Frankfurter ECB rates (1-h cache)
│     ├─ music/route.ts         song → YouTube videoId (Piped/Invidious/official-API cascade)
│     ├─ ask/route.ts           short AI answers (Ollama → Groq → Gemini)
│     └─ settings/route.ts      httpOnly-cookie key storage (TypeSafe / Groq / Gemini)
├─ components/
│  ├─ icons.tsx                 26 inline SVG icons (the only icons in the project)
│  ├─ shift/
│  │  ├─ Shell.tsx              THE app: input, ghost cycle, calm loop, timers, reminders,
│  │  │                         shortcuts, share-view, history, HUD
│  │  ├─ CardBody.tsx           one card per intent + fetch hook (weather/convert/music/search)
│  │  └─ SettingsPanel.tsx      connection modes, API keys, personalization, shortcuts editor
│  └─ studio/StudioClient.tsx   goal form, schema view, playground, saved schemas, key box
└─ lib/
   ├─ jev/
   │  ├─ types.ts               IntentKey, IntentResult, ContextPack — the shared contract
   │  ├─ questions.ts           the Jev question schema used by the shell
   │  ├─ client.ts              SDK-free System One POST (state+questions), 2.5 s single shot
   │  └─ mock.ts                offline classifier (mirrors API output exactly)
   ├─ schema/                   Schema Studio brain
   │  ├─ packs.ts               7 pre-made task packs (email, support, expense, habit,
   │  │                         moderation, mood, music-mood)
   │  ├─ router.ts              zero-model keyword router to a pack
   │  ├─ prompt.ts              system prompt + JSON grammar for the tiny translator LLM
   │  ├─ providers.ts           Ollama / Groq / Gemini calls (grammar-locked where possible)
   │  ├─ simulate.ts            honest keyword simulator for offline playground answers
   │  ├─ template.ts            last-resort generic schema
   │  └─ types.ts               loose-zod parse + normalise/repair (slugs, escape options)
   ├─ server/keys.ts            env → cookie key resolution shared by routes
   ├─ parse.ts                  deterministic value parsers (timer, split, convert, event,
   │                            reminder-time, habit, poll, weather-place, music/search query)
   ├─ calm.ts                   the anti-flicker champion/challenger reducer
   ├─ db.ts                     IndexedDB v2: cards, songs, schemas, meta
   └─ context/pack.ts           builds the Context Pack + recent-intent histogram
```

## The 13 intents

| Intent | Try typing | Card behaviour |
|---|---|---|
| event | `dinner with priya friday 8pm on zoom` | when/time/people/mode chips |
| reminder | `remind me in 30 min stretch` | schedules + fires for real |
| todo | `buy milk, eggs, bread and coffee` | live checklist |
| timer | `25 min focus` | Enter starts countdown → corner pill |
| habit | `gym 3x a week` | frequency chips + streak tick in History |
| weather | `weather in mumbai` | live temp/hi-lo/wind (free API) |
| split | `split 2400 between 3` | ₹800 each + remainder |
| convert | `5 miles in km` · `100 usd to inr` | unit math in code, live FX via API |
| calc | `18% of 3450` | instant result |
| poll | `pizza or burgers for friday?` | tappable votes with bars |
| music | `play daft punk` | embedded player + save/queue |
| search | `search taj mahal` | instant answer + links + Ask AI |
| note | anything else | plain note, saves with Enter |

## Setup

```bash
npm install
npm run dev            # http://localhost:3000 — works fully offline by default
```

### Environment (all optional — copy `.env.example`)

| Var | Purpose | Default |
|---|---|---|
| `TYPESAFE_API_KEY` | Online Jev (else offline classifier) | _empty → offline_ |
| `JEV_MODEL` | Pinned model | `jev-latest` |
| `JEV_ENDPOINT` | Override System One endpoint | `api.typesafe.ai/v1/systemone` |
| `NEXT_PUBLIC_USE_MOCK` | Force offline even with a key | `false` |
| `YOUTUBE_API_KEY` | Optional official music resolver upgrade | _empty_ |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | Local translator/Ask-AI | `localhost:11434` / `qwen3:0.6b` |
| `GROQ_API_KEY`, `GEMINI_API_KEY` | Free-tier online fallbacks | _empty_ |

Keys can also be pasted in the in-app ⚙ panel — stored as httpOnly cookies, only ever
read by server routes. Env always wins.

### Local AI (recommended, free, uses your GPU)

```bash
ollama pull qwen3:0.6b    # ~450 MB — powers Schema Studio generation + Ask AI
# optional quality bump on a 4 GB card:
#   OLLAMA_MODEL=qwen3:4b in .env.local
```

Ollama auto-detects CUDA (a GTX 1650 runs the 0.6B instantly; a 4B q4 fits too).

## Testing checklist

1. Box centered, ghost text cycles at the **left edge**
2. `timer 25 mins` → Enter → white pill bottom-left ticks; ⏸ ▶ × work
3. `remind me in 1 min stretch` → Enter → fires in ~a minute (chime + notification)
4. `split 2400 between 3` → ₹800 each; `2+2*3` → calculator
5. `play <any song>` → embedded player; ♥ Save song → queue chips appear
6. `search taj mahal` → answer/links (needs network), Ask AI → needs Ollama or key
7. Enter any card → History; link icon copies a share URL; habit tick grows a streak
8. ⚙ → mode switch (auto/online/offline), paste key, personalize toggle, shortcuts
9. `/studio` → goal `triage my gmail inbox` → instant pack; paste a novel goal → local model/template; playground Run
10. `?c=<share-link>` renders the shared card with a dismiss tag

## Deploy

Any Node host works (`npm run build && npm start`). For Vercel: import the repo, set
`TYPESAFE_API_KEY` in project env if you have one, done — all routes are
`runtime: nodejs` and degrade gracefully offline. No DB to provision (IndexedDB +
user cookies).

## Rules this codebase follows

1. **No emojis in the UI** — SVG icons only (`components/icons.tsx`)
2. One card grammar: tinted icon + title / hero / ≤3 actions; everything else hides
3. One spring, one ease (`cubic-bezier(0.23,1,0.32,1)`), `prefers-reduced-motion` respected
4. The model never extracts values, counts, or does date math — parsers do
5. Everything degrades gracefully: no key, no network, no GPU → still usable, always labelled
