# Century Radio — User & Content Guide

Welcome to **Century Radio** (`https://century-radio.vercel.app`), an interactive 1920s vacuum-tube AM radio broadcasting non-stop news, special reports, multi-voice radio dramas, vintage comedy & vaudeville, market tickers, regional weather, and verified Great 78 Project music from **today's exact calendar date, 100 years ago** (`1926` / `1927`).

---

## 1. Using the Radio

### Dual Receiver Views (`[V]`)
Switch live between two authentic interfaces from the top header (or press **`V`**):
- **Broadcaster’s Desk (Default)**: Compact tactile receiver strip paired with a live AP Wire / Teletype console and an **Editorial Desk** panel containing **Press Clippings** (contemporary newspaper citations & primary sources) and a clickable **Program Guide**.
- **Lab Receiver**: Full Braun / Teenage Engineering matte-enamel instrument faceplate with CRT green phosphor oscilloscope, ballistic VU meter, inertia/detent vernier dial, Magic Eye carrier lock, and collapsible archival drawers.

### Power & Tube Warm-Up (`[P]`)
- Flip the **Power** switch (or press **`P`**) to glow up the three vacuum-tube filaments over **2.4 seconds** as the 60 Hz mains hum, shellac crackle, and master gain ease in.
- On power-on, **Live Sync** automatically tunes into the exact segment and timestamp currently playing on the continuous daily broadcast clock.

### Tuning the AM Band (`550 – 1600 kHz`, Keys `[1–5]`)
- **Drag, Scroll, Slider, or Presets**:
  - **`640 kHz • WCC-MARCONI`**: Chatham Marine Wireless telegraph station transmitting real ITU Morse code (~17 WPM) dispatches of today's headlines with a live decoded paper tape monitor.
  - **`710 kHz • WCRN-AM`**: New York flagship continuous 18-segment broadcast (~50 minutes per cycle) featuring multi-voice radio theatre, variety/comedy hour, Wall Street ticker, exact-day news bulletins, and Great 78 Project music.
  - **`870 kHz • WGN-MIDWEST`**: Chicago clear-channel station (Tribune Tower / Drake Hotel) with its own Midwest programming: Chicago Board of Trade grain & livestock ticker, Great Lakes Weather Bureau dispatch, Midwest sports, and regional sponsor reads.
  - **`980 kHz • NAA-TIME`**: Arlington U.S. Naval Observatory standard 1 Hz time-signal chronometer aligned to real UTC second ticks.
  - **`1240 kHz • KFOX-78`**: Non-stop, 24/7 Great 78 Project 78rpm jukebox cycling through 60+ verified 1919–1927 jazz, blues, ballroom, classical, and vaudeville recordings.

### Navigating History & Programs
- **Date Picker & Century Offset**: Step day-by-day (**← Prev** / **Next →**), jump directly to any date in `1926–1927` via the calendar input, switch between **1926** and **1927**, or pick curated historic landmark broadcasts.
- **18-Segment Continuous Continuity**: Station Sign-On, Lead National & World Wire, Ballroom Interlude, Special Correspondent Feature, Sponsor Read #1, 1920s Variety & Comedy Hour (with spoken host intro + real vaudeville 78rpm record), Financial Ticker, Hot Jazz Interlude, Developing Telegraph Wire, Science & Aviation, Sponsor Read #2, Multi-Voice Mystery Playhouse Radio Drama, Concert Hall Orchestra Remote, Seasonal Sports & Stage Review, In Memoriam / Telegraph Notices, Midnight Blues Interlude, Seasonal Weather Bureau Forecast, and Fireside Sign-Off.

---

## 2. Historical & Content Pipeline Architecture

### A. Exact-Day Historical Ingestion (`src/lib/server/history/`)
- **`wikiChronicle.ts`**: Fetches exact `Month_Year` Wikipedia day-by-day chronicles (`November_1926`, etc.), parses exact-day events, deaths, births, developing wire items (`day - 1`, `day - 2`), extracts contemporary `<ref>{{cite news}}</ref>` press clippings, and enriches linked entities via the Wikipedia REST Page Summary API.
- **`wikiYearContext.ts`**: Pulls same-month radio and national milestones from `${Year}_in_radio` and `${Year}_in_the_United_States`.
- **`wikimedia.ts`**: Supplements with Wikimedia On This Day events, births, and deaths.
- **`periodContext.ts` & `vintageChronicles.ts`**: Curated historical backstop when live APIs return sparse items.

### B. Verified Great 78 Project Catalog (`src/lib/data/music-catalog.json`)
- Refreshed via:
  ```bash
  node --experimental-strip-types scripts/index-78rpm.ts
  ```
- Every entry stores an exact verified `identifier`, `mp3File` derivative path, `durationSec`, `year` (`<= 1927`), `moodTags`, and `category` (`jazz`, `blues`, `ballroom`, `classical`, `comedy`).
- Streamed continuously via `/api/archive-audio?id=...` and sequenced for `KFOX-78` via `/api/music-stream`.

### C. Multi-Voice Script & Deepgram Aura-2 TTS (`src/lib/server/llm/` & `src/lib/server/tts/`)
- **`scriptGenerator.ts`**: Uses DeepSeek-V4.1-Flash (`deepseek-flash` via `DEEPSEEK_API_KEY`) as primary continuity scriptwriter, automatically falling back to Gemini Interactions (`gemini-3.8-flash` via `@google/genai`) and then the 18-segment deterministic `periodContentLibrary.ts` generator (16 authentic 1920s sponsors, 4 seasonal/regional weather generators, NYSE vs Chicago Board of Trade market desks, and multi-voice radio dramas). Set `LLM_PRIMARY_PROVIDER=gemini` to make Gemini primary with DeepSeek as fallback once `GEMINI_API_KEY` is topped up.
- **`deepgram.ts`**: Maps character roles (`ANNOUNCER`, `CLARA`, `INSPECTOR`, `REPORTER`, etc.) and segment genres across `aura-2-apollo-en`, `aura-2-orion-en`, `aura-2-asteria-en`, and `aura-2-athena-en`, automatically stitching multi-turn dialogues cleanly.

---

## 3. Local Development, Testing & Redeployment

- **Install dependencies**:
  ```bash
  npm install
  ```
- **Run locally**:
  ```bash
  npm run dev
  ```
- **Typecheck, unit tests, and production build**:
  ```bash
  npm run check && npm test && npm run build
  ```
- **Deploy updates to Vercel**:
  ```bash
  npx vercel --prod
  ```
- **Environment Variables**:
  - `DEEPGRAM_API_KEY`: Enables live multi-voice Deepgram Aura-2 TTS on `/api/tts`.
  - `DEEPSEEK_API_KEY` (and optional `DEEPSEEK_MODEL=deepseek-flash`): Enables DeepSeek-V4.1-Flash primary continuity scripting.
  - `GEMINI_API_KEY`: Enables Gemini `gemini-3.8-flash` Interactions API scripting (set `LLM_PRIMARY_PROVIDER=gemini` to prioritize Gemini over DeepSeek; otherwise Gemini acts as automatic fallback).
  - `BLOB_READ_WRITE_TOKEN` & `CRON_SECRET`: Optional production Vercel Blob caching & daily cron prewarming (`/api/cron/daily`).
