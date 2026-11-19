# Century Radio — Architecture & Phase 1 Handoff

## 1. Project Goal
**Century Radio** is a Vercel-deployed web experience simulating an authentic 1920s vacuum-tube AM radio broadcast **"on this day in history, 100 years ago"** (`DD.MM.YYYY - 100 years`, e.g., `1926`, `1927`).

## 2. Agreed Architecture & Tech Stack
- **Frontend Framework**: **SvelteKit (Svelte 5 + TypeScript)** with `@sveltejs/adapter-vercel` (lightweight, zero VDOM overhead for 60fps Canvas/SVG rendering, built-in Vercel serverless routes).
- **Audio & Physics Isolation**: All Web Audio API nodes, `requestAnimationFrame` loops, and dial inertia physics live in pure TypeScript modules (`src/lib/audio/`, `src/lib/physics/`), decoupled from UI component reactivity.
- **Content & TTS Pipeline (Phases 2–3)**:
  - **Historical Ingestion**: Wikimedia "On This Day" API + Library of Congress Chronicling America API (with a static fallback JSON calendar).
  - **Script Generation**: Gemini (`@google/genai`, `gemini-2.5-flash`) with Structured Outputs (`responseSchema`) producing present-tense 1926 Mid-Atlantic radio scripts.
  - **Voice Synthesis**: **Deepgram Aura-2 TTS** (`DEEPGRAM_API_KEY` server-side only) outputting `linear16` WAV / high-bitrate MP3 cached in **Vercel Blob** via daily Vercel Cron.
  - **Music Sourcing**: Internet Archive **Great 78 Project** (`collection:georgeblood`, filtered `year <= targetYear`) via a pre-indexed catalog (`src/lib/data/music-catalog.json`).

## 3. Data Schema (`BroadcastDay` & `BroadcastSegment`)
- `BroadcastDay`: `schemaVersion`, `id` (`"1926-11-15"`), `stationCallsign` (`"WCRN-AM"`), `stationLocation`, `targetFrequencyKHz` (`710`), `totalDurationSec`, `segments[]`, `generatedAt`.
- `BroadcastSegment`: `id`, `order`, `type` (`'STATION_ID' | 'NEWS_BULLETIN' | 'MUSIC_INTERLUDE' | 'VINTAGE_AD' | 'WEATHER_REPORT' | 'TIME_SIGNAL'`), `title`, `scheduledOffsetSec`, `durationSec`, `moodTags`, `topicTags`, `scriptText`, `audio` (`sourceType`, `url`, `format`, `durationSec`), `sources[]`.

## 4. Web Audio API Signal Flow (Phase 1 Core)
- **Program Bus**: Spoken TTS / Sample Audio + Time Signal Pips -> **Carbon Mic / AM Bandpass** (`HPF 300Hz` -> `Peaking 1.2kHz +4dB` -> `LPF 3.5kHz` cascaded) -> **Wow & Flutter** (`DelayNode` 15ms modulated by `0.4Hz` + `5.5Hz` LFOs) -> **Tube Warmth** (`WaveShaperNode` asymmetric `tanh(kx + 0.15x^2)`, `oversample: 4x`).
- **Generative Bed**: `60Hz`/`120Hz` AC mains hum (`-40 dB`) + pre-computed looping vinyl/78rpm crackle & dust impulse buffer.
- **Interactive Tuning**: Looping white-noise static buffer crossfaded inversely with `signalStrength` (`0.0 -> 1.0`), plus a **heterodyne beat whistle** (`OscillatorNode`, `180Hz–4.2kHz`) that sweeps with `|currentKHz - targetKHz|` and drops to zero-beat at carrier lock.
- **Output Stage**: `DynamicsCompressorNode` (`-12dB` threshold, `4:1`) -> `AnalyserNode` (feeds Canvas oscilloscope & VU meter) -> `MasterWarmupGainNode` (2.5s tube warm-up ramp) -> `AudioContext.destination`.

## 5. UI/UX Decision: Dual Prototype (Option B + Option C)
The user requested building **both** UI/UX concepts side-by-side behind a live **Mode / View Switcher** so they can evaluate and decide:
1. **Option B — "The Braun / Teenage Engineering Lab"**: Matte cream enamel & anodized aluminum faceplate, Swiss grotesk typography, precision hairline vernier dial with inertia/detent physics, green phosphor oscilloscope, mechanical toggle switches.
2. **Option C — "The Broadcaster's Desk"**: Compact tactile receiver strip paired with a live **1926 AP Wire / Teletype Transcript** and newspaper clipping drawer displaying `scriptText` and clickable historical source citations in sync with playback.

## 6. Immediate Next Steps (Phase 1 Execution)
1. **Scaffold & Install Dependencies** (requires npm registry access):
   - Initialize SvelteKit + TypeScript + Tailwind CSS + `@sveltejs/adapter-vercel` in `/home/kaly/dev/century-radio`.
   - Install `vitest` for unit testing the audio state machine, tuning math, and schedule logic.
2. **Implement Phase 1 Modules**:
   - `src/lib/state/radioStore.ts`: Power FSM (`OFF` -> `WARMING_UP` -> `ON`), tuning state, schedule & date-offset state.
   - `src/lib/audio/dspGraph.ts`: Full Web Audio DSP chain, generative crackle/hum, heterodyne whistle, and `AnalyserNode` helpers.
   - `src/lib/physics/dialPhysics.ts`: Inertia/friction + magnetic carrier detent physics.
   - `src/lib/data/sampleBroadcast.ts`: Hardcoded `1926-11-15` sample `BroadcastDay` + synthesized/local test audio so Phase 1 works 100% offline.
   - Dual UI components (`BraunLabSkin.svelte` & `BroadcasterDeskSkin.svelte`) + live switcher, phosphor `<canvas>` oscilloscope, and damped analog VU meter.
3. **Verify**: Run typecheck, unit tests, and production build (`npm run build`).
