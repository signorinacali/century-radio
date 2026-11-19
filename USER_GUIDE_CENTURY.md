# Century Radio — User & Content Guide

Welcome to **Century Radio** (`https://century-radio.vercel.app`), an interactive 1920s vacuum-tube AM radio that broadcasts news, weather, vintage sponsor reads, and 78rpm music from **today's exact calendar date, 100 years ago** (`1926` / `1927`).

---

## 1. Using the Radio

### Power & Tube Warm-Up
- Flip the **Power** switch in the top-right of the receiver faceplate (or press **`P`** on your keyboard).
- The three vacuum-tube filaments glow up over **2.4 seconds** while the 60 Hz mains hum, shellac crackle, and master gain ease in—just like an authentic 1920s super-heterodyne receiver.

### Tuning the AM Band (`550 – 1600 kHz`)
- **Drag or Scroll**: Drag your pointer across the vernier dial strip (it has real inertia and magnetic station detents) or scroll with your mouse wheel / trackpad.
- **Accessible Slider & Presets**: Use the range slider below the dial or click any of the **Carrier Presets** (or press keys **`1`** through **`5`**):
  - **`640 kHz • WCC-MARCONI`**: Chatham Marine Wireless telegraph station transmitting transatlantic continuous-wave (CW) Morse code dispatches.
  - **`710 kHz • WCRN-AM`**: Main Century Radio historical broadcast (Gemini-written 1926/1927 scripts voiced via multi-character Deepgram Aura-2 cast + Great 78 Project music interludes).
  - **`870 kHz • WGN-MIDWEST`**: WGN Chicago clear-channel broadcast with Drake Hotel concert orchestra and Midwest news wire dispatches.
  - **`980 kHz • NAA-TIME`**: U.S. Naval Observatory time-signal pips.
  - **`1240 kHz • KFOX-78`**: Continuous pre-1927 78rpm ballroom & jazz stream.
- **Heterodyne Whistle & Static**: Tuning slightly off-carrier produces an authentic AM heterodyne beat whistle that drops to zero-beat as the 4-LED **Magic Eye** lock bar illuminates green.

### Navigating History & Segments
- **Century Offset (`-100 Yrs`)**: Use **← Prev** / **Next →** to step day-by-day through the calendar, or toggle **Era** between **`1926`** and **`1927`**.
- **Segment Pills (`01`–`12`)**: Jump directly between 12 distinct program segments:
  - `01 · STATION ID`: Formal sign-on (710 kHz / 422.3 meters) and evening schedule preview.
  - `02 · NEWS BULLETIN`: Lead national & international wire dispatches (multi-paragraph journalistic reporting).
  - `03 · FEATURE STORY`: In-depth narrative special correspondent report.
  - `04 · MUSIC INTERLUDE`: Pre-1927 78rpm ballroom/jazz recording with spoken Victrola intro.
  - `05 · MARKET REPORT`: Wall Street & Curb Exchange ticker with call money and commodities.
  - `06 · NEWS BULLETIN`: Telegraph wire bulletins & developing dispatches from the week.
  - `07 · SCIENCE AND AVIATION`: 1920s airmail routes, radio engineering, and modern marvels.
  - `08 · SPORTS ROUNDUP`: Arena athletics, boxing rings, gridiron, and Broadway lights.
  - `09 · MUSIC INTERLUDE`: Late evening 78rpm syncopation or blues selection.
  - `10 · VINTAGE AD`: Authentic 1926 sponsor commercial read (Radiola, Victrola, Ford).
  - `11 · WEATHER REPORT`: U.S. Weather Bureau regional and Atlantic maritime forecast.
  - `12 · FIRESIDE EDITORIAL`: Evening sign-off and reflective commentary on the modern century.
- **Distinct Character Voices**: Segment types feature specialized Deepgram Aura-2 cast personalities:
  - Lead News, Editorial & Sign-On: `aura-2-apollo-en` (authoritative Mid-Atlantic newsman)
  - Market Ticker & Sports Desk: `aura-2-orion-en` (brisk, resonant announcer)
  - Vintage Sponsor Advertisements: `aura-2-asteria-en` (warm, persuasive commercial pitch)
  - Weather & Aviation/Science: `aura-2-athena-en` (clear, articulate reporter)
- **Primary Sources**: Below the live broadcast script, click any **Source** link to inspect the original Wikipedia or Library of Congress dispatch.
- **Dark Mode**: Use the **Dark / Light** toggle in the top-right page header to switch between matte cream enamel and dark anodized slate (your preference is saved automatically).

---

## 2. How to Make Century Radio Even More Content-Rich

### A. Adding New Historical Content Sources
All historical ingestion lives in `src/lib/server/history/`:
1. **Create a new source adapter** (e.g., `src/lib/server/history/nyTimesArchive.ts` or a sports/weather/aviation RSS/JSON feed) that returns `IngestedFact[]` (matching the interface in `src/lib/server/history/wikimedia.ts`):
   ```typescript
   export interface IngestedFact {
     kind: 'event' | 'birth' | 'death' | 'newspaper';
     year: number;
     date: string; // "YYYY-MM-DD"
     text: string;
     source: {
       provider: 'wikipedia' | 'chronicling_america' | 'curated_archive';
       title: string;
       url?: string;
       originalDate: string;
     };
   }
   ```
2. **Register it in `src/lib/server/history/ingest.ts`**:
   Add your fetcher to the `Promise.all([...])` call inside `ingestHistoricalFacts(isoDate)`. Gemini will automatically weave those new facts into the broadcast script and attach their citations.

### B. Expanding the 78rpm Music Catalog (Internet Archive)
Music interludes and `KFOX-78` pull from `src/lib/data/music-catalog.json` (filtered strictly to `year <= targetYear`).
- **Refresh automatically from Internet Archive's Great 78 Project**:
  ```bash
  node --experimental-strip-types scripts/index-78rpm.ts
  ```
- **Or add tracks manually** to `src/lib/data/music-catalog.json`:
  ```json
  {
    "identifier": "<internet-archive-item-id>",
    "title": "Song Title",
    "creator": "Orchestra or Artist",
    "year": 1926,
    "durationSec": 180,
    "moodTags": ["jazz", "upbeat"]
  }
  ```
  Supported `moodTags`: `"urgent"`, `"solemn"`, `"upbeat"`, `"jazz"`, `"fireside"`.

### C. Customizing the Broadcast Format & Announcer Voice
- **Script Style & Segment Mix**: Edit the Gemini prompt and `responseSchema` in `src/lib/server/llm/scriptGenerator.ts` (for example, to add a dedicated **Stock Market / Curb Exchange Report**, **Sports Scores**, or **Fireside Editorial**).
- **Deepgram Voice Model**: Change the default `model` parameter (`aura-2-apollo-en`) in `src/lib/server/tts/deepgram.ts` and `scriptGenerator.ts` to experiment with different Deepgram Aura-2 voices—or even assign distinct voices per segment type (e.g., one voice for news anchors, another for sponsor ads).

### D. Adding More AM Stations on the Dial
Edit `DEFAULT_STATIONS` in `src/lib/physics/dialPhysics.ts` to add new frequencies between `550` and `1600 kHz` (e.g., regional stations like Chicago or London) and handle their `programMode` in `src/lib/state/radioStore.svelte.ts`.

---

## 3. Local Development & Redeployment

- **Run locally**:
  ```bash
  npm run dev
  ```
- **Typecheck, tests, and production build**:
  ```bash
  npm run check && npm test && npm run build
  ```
- **Deploy updates to Vercel**:
  ```bash
  npx vercel --prod
  ```
- **Optional Production Caching**: Set `BLOB_READ_WRITE_TOKEN` in Vercel to persist generated `BroadcastDay` JSON and Deepgram MP3s in Vercel Blob across serverless cold starts, and set `CRON_SECRET` to protect `/api/cron/daily`.
