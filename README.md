# Century Radio

An interactive 1920s vacuum-tube AM radio web experience that broadcasts news, weather, vintage sponsor reads, and 78rpm music from **on this day in history, 100 years ago** (`1926` / `1927`).

Built with SvelteKit (Svelte 5 + TypeScript), Tailwind CSS v4, the Web Audio API, Gemini (`@google/genai`), Deepgram Aura-2 TTS, and Internet Archive's Great 78 Project.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Testing and Validation](#testing-and-validation)
- [AM Band Presets and Controls](#am-band-presets-and-controls)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Further Documentation](#further-documentation)

---

## Overview

Century Radio simulates a 1920s super-heterodyne AM receiver in the browser. Flipping the power switch warms up the vacuum-tube filaments over 2.4 seconds while 60 Hz mains hum, shellac crackle, and master gain ease in. Tuning across the `550 - 1600 kHz` AM band uses inertia and magnetic carrier detents, complete with off-carrier static, a heterodyne beat whistle, a 4-LED lock indicator, a phosphor oscilloscope, and a damped analog VU meter.

On the main broadcast frequency (`710 kHz • WCRN-AM`), historical facts from 100 years ago are ingested from Wikimedia "On This Day" and the Library of Congress Chronicling America archive, woven into present-tense 1920s radio scripts by Gemini, voiced by a multi-character Deepgram Aura-2 cast, and paired with pre-1927 78rpm recordings from the Internet Archive.

---

## Features

- **Web Audio DSP Chain**: Carbon mic / AM bandpass filtering (`HPF 300 Hz`, `Peaking 1.2 kHz`, `LPF 3.5 kHz`), wow & flutter LFO modulation, asymmetric tube warmth (`WaveShaperNode`), 60/120 Hz AC mains hum, shellac crackle, heterodyne beat whistle, and dynamics compression.
- **Tactile Vernier Dial Physics**: Pure TypeScript dial inertia, friction, and magnetic station detents decoupled from UI component reactivity.
- **Historical Ingestion & Script Generation**: Pulls historical events and newspaper dispatches for `today - 100 years` (`1926` / `1927`) and generates structured 12-segment broadcast days via `@google/genai`.
- **Multi-Voice Synthesis**: Routes segment types to distinct Deepgram Aura-2 voices (`aura-2-apollo-en`, `aura-2-orion-en`, `aura-2-asteria-en`, `aura-2-athena-en`) with optional Vercel Blob caching.
- **78rpm Music Archive**: Streams pre-1927 recordings indexed from the Internet Archive Great 78 Project (`src/lib/data/music-catalog.json`).
- **Live Instrumentation & Theme Support**: Real-time `<canvas>` phosphor oscilloscope, analog VU meter, primary source citations, keyboard shortcuts, and persistent dark/light mode.

---

## Architecture

```
Historical Sources (Wikimedia / Chronicling America / Vintage Chronicles)
        |
        v
  Ingest Pipeline (src/lib/server/history/)
        |
        v
  Gemini Script Generator (src/lib/server/llm/scriptGenerator.ts)
        |
        +---> Deepgram Aura-2 TTS (src/lib/server/tts/deepgram.ts)
        |
        +---> Internet Archive 78rpm Catalog (src/lib/server/archive/great78.ts)
        |
        v
  SvelteKit API Routes (/api/broadcast, /api/tts, /api/archive-audio)
        |
        v
  Browser Client: Dial Physics + Web Audio DSP Graph + Svelte 5 UI
```

---

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5, TypeScript, Vite)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Audio & Visualization**: Web Audio API, HTML5 Canvas
- **AI & Voice**: `@google/genai`, Deepgram Aura-2 TTS
- **Storage & Hosting**: `@vercel/blob`, `@sveltejs/adapter-vercel`
- **Testing**: [Vitest](https://vitest.dev/), `svelte-check`

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Optional API keys for live script generation and TTS (the app includes a built-in `1926-11-15` sample broadcast for offline development):
  - `GEMINI_API_KEY`
  - `DEEPGRAM_API_KEY`

### Installation

```bash
git clone https://github.com/signorinacali/century-radio.git
cd century-radio
npm install
```

### Environment Variables

Copy the template and add your keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `APP_ENV` | No | Environment name (`development` by default) |
| `PORT` | No | Local server port (`3000` by default) |
| `DEBUG` | No | Enable debug logging (`true` / `false`) |
| `GEMINI_API_KEY` | For live scripts | Google Gemini API key for `@google/genai` |
| `DEEPGRAM_API_KEY` | For live TTS | Deepgram API key for Aura-2 voice synthesis |
| `BLOB_READ_WRITE_TOKEN` | Optional (Prod) | Vercel Blob token for caching generated broadcasts and MP3s |
| `CRON_SECRET` | Optional (Prod) | Bearer secret for protecting scheduled cron endpoints |

### Running Locally

Start the development server:

```bash
npm run dev
```

To refresh the pre-1927 78rpm music catalog from the Internet Archive:

```bash
node --experimental-strip-types scripts/index-78rpm.ts
```

---

## Testing and Validation

Run typechecking, unit tests, and production build verification:

```bash
npm run check
npm test
npm run build
```

---

## AM Band Presets and Controls

| Frequency | Callsign | Program |
| :--- | :--- | :--- |
| `640 kHz` | `WCC-MARCONI` | Chatham Marine Wireless transatlantic Morse code dispatches |
| `710 kHz` | `WCRN-AM` | Main Century Radio 12-segment historical broadcast |
| `870 kHz` | `WGN-MIDWEST` | WGN Chicago Midwest news & concert broadcast |
| `980 kHz` | `NAA-TIME` | U.S. Naval Observatory time-signal pips |
| `1240 kHz` | `KFOX-78` | Continuous pre-1927 78rpm ballroom & jazz stream |

**Keyboard Shortcuts**:
- `P`: Toggle receiver power
- `1` - `5`: Jump to carrier presets

---

## Project Structure

```
century-radio/
├── docs/                  # Architecture notes
├── scripts/               # Utility scripts (78rpm Internet Archive indexer)
├── src/
│   ├── lib/
│   │   ├── audio/         # Web Audio DSP graph (dspGraph.ts)
│   │   ├── components/    # Svelte 5 UI components (BraunLabSkin, VU meter, Oscilloscope)
│   │   ├── data/          # Sample broadcast and 78rpm music catalog
│   │   ├── physics/       # Vernier dial inertia & carrier detent physics
│   │   ├── server/        # History ingestion, Gemini scripts, Deepgram TTS, Blob cache
│   │   ├── state/         # Reactive radio state machine (radioStore.svelte.ts)
│   │   └── types/         # Shared TypeScript interfaces
│   └── routes/            # SvelteKit pages and /api/* server endpoints
└── tests/                 # Vitest unit & pipeline test suites
```

---

## Deployment

Century Radio is configured for Vercel via `@sveltejs/adapter-vercel` and `vercel.json`:

```bash
npx vercel --prod
```

---

## Further Documentation

- [USER_GUIDE_CENTURY.md](./USER_GUIDE_CENTURY.md) — Detailed listener guide and instructions for extending historical sources, stations, and voices.
- [HANDOFF.md](./HANDOFF.md) — Phase 1 architecture and Web Audio signal-flow notes.
- [AGENTS.md](./AGENTS.md) — Repository conventions for contributors and coding agents.
