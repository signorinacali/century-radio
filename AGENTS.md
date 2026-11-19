# Agent Instructions & Context: century-radio

Welcome to `century-radio`. This document provides vital repository layout, guidelines, and context for AI coding agents (Antigravity, Gemini, OpenCode, Claude Code, Cursor, etc.).

---

## Project Blueprint
- **Repository:** `century-radio`
- **Status:** Active Production Web Radio App
- **Primary Tech Stack:** SvelteKit (Svelte 5 + TypeScript), Tailwind CSS v4, Web Audio API DSP, `@sveltejs/adapter-vercel`, `@google/genai`, Deepgram Aura-2 TTS, Vitest

## Directory Map
| Directory | Purpose |
| :--- | :--- |
| `src/` | Application logic, Web Audio DSP graph, dial physics, Svelte 5 UI skins, server ingestion & API routes |
| `docs/` | Architecture notes, design system, API docs, specifications |
| `tests/` | Vitest unit tests covering dial physics, Morse encoding, archive catalog, and server ingestion/scripting |
| `scripts/` | Utility scripts (`index-78rpm.ts` Internet Archive catalog indexer) |
| `.github/` | GitHub Actions CI/CD workflows |

## Standard Commands
- **Install dependencies:** `npm install`
- **Start dev mode:** `npm run dev`
- **Run tests:** `npm test`
- **Lint / Typecheck:** `npm run check`
- **Build for release:** `npm run build`

## Agent Rules & Conventions
1. **Explore Before Modifying:** Understand existing module architecture before altering or deleting code.
2. **Preserve Documentation:** Keep existing docstrings and comments intact unless deliberately refactoring.
3. **No Unchecked Secrets:** Never hardcode secrets, tokens, or private keys. Reference variables via `.env`.
4. **Atomic & Clean Commits:** Make descriptive commits following Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
5. **Verify Before Finish:** Ensure tests pass and no unintended file mutations occur.
