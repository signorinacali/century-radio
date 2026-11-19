You are a Principal Software Architect and Creative Technologist. Your goal is to produce a comprehensive technical implementation plan and system architecture for a web application called "Century Radio", which will be deployed on Vercel.

### Concept Overview
A web experience that simulates an authentic 1920s vacuum-tube radio broadcast "on this day in history" and would stream the content of what happened on exact date, but 100 years ago. The app determines today's calendar date ($DD.$MM) and broadcasts content as if it were broadcasting live on that exact day hundred years ago ($DD.$MM.1926 and $DD.$MM.1927, $DD.$MM.$YYYY). Broadcasts include:
1. World & local news bulletins from that specific day in 1926/1927/... .
2. Authentic 1920s music interludes, station IDs, and vintage ad reads/weather reports.
3. Skewmorphic/vintage-modern radio interface with interactive tuning, static noise, and vacuum-tube visualizer. UI is not determined yet, opened for suggestions.

---

### Required Planning Deliverables

Provide a modular, production-ready implementation plan covering the following pillars:

#### 1. System Architecture & Tech Stack Selection
- Recommend a lightweight frontend framework (e.g., React/Vite, SvelteKit, or vanilla modern TypeScript) optimized for low-latency audio processing and canvas/SVG rendering.
- State management strategy for audio playback state, tuning frequency, current "broadcast schedule", and day offset navigation.

#### 2. Historical Content & Ingestion Pipeline
- Strategy for fetching and structuring daily 1926 historical events:
  - Integration options (e.g., Wikipedia API "On This Day" filtered to 1926, Chronicling America / historical newspaper archives, or an offline pre-generated structured JSON calendar database).
  - Schema design for a "Broadcast Day" (timestamps, segments, script texts, mood/topic tags).
  - LLM script generation strategy: How to use Gemini to transform dry historical bullet points into period-accurate 1926 radio broadcast scripts (Mid-Atlantic/transatlantic accent phrasing, 1920s radio vernacular, station breaks)
  - TTS implementation strategy: I'm leaning towards Deepgram's TTS as a provider, since I have an API key with credits (the API is stored in the shell)

#### 3. Audio Engineering & The Web Audio API Graph
- Detailed Web Audio API audio graph diagram and DSP chain to achieve an authentic 1920s AM/carbon microphone acoustic quality:
  - Bandpass filtering (cutting sub-bass <300Hz and harsh highs >3.5kHz).
  - Tube warmth / asymmetric wave shaper distortion.
  - Generative background vinyl crackle, 50/60Hz AC hum, and subtle wow/flutter (pitch modulation via LFO).
  - Interactive heterodyne whistle and white-noise static buffer when dragging the tuning dial between stations.

#### 4. Voice Synthesis & Audio Assets (Public Domain)
- TTS Pipeline: Recommendations for generating or streaming the period-accurate radio announcer voice (e.g., ElevenLabs vintage voice models, Gemini Audio, or Web Speech API routed through the DSP chain).
- Music & Audio sourcing: Strategy for pulling 1926, 1927... audio tracks (leveraging the Internet Archive's "Great 78 Project" API / public domain audio collections, filtered by year <= 1926).

#### 5. UI/UX & Interaction Design (ideas)
- Dial physics: Inertia/drag physics for tuning knobs or slide dials.
- Visual elements: Filament warm-up sequences, analog VU meters, phosphor glow, or oscilloscope canvas rendering driven by real-time `AnalyserNode` data.
- Feel free to popose 3 UI/UX options with explanations why would they fit the idea

#### 6. Phased Implementation Roadmap
- Break the build into 4 clear phases:
  - Phase 1: MVP Audio Graph & Static Stream Simulation
  - Phase 2: Historical Scraping & Script Engine
  - Phase 3: Internet Archive Music Integration & Dynamic Program Flow
  - Phase 4: Interface & Polish

Please begin by laying out the Architecture Decisions, Data Schema, and the Web Audio API signal flow.