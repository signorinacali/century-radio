import type { SignalLockResult } from '$lib/physics/dialPhysics';
import type { StationPreset } from '$lib/types/broadcast';
import { encodeMorseSymbols, type MorseSymbolEvent } from './morseEncoder';

export interface AudioPlayOptions {
	startOffsetSec?: number;
	onLoaded?: (durationSec: number) => void;
	onEnded?: () => void;
}

export interface PlaybackProgress {
	currentTime: number;
	duration: number;
	isPlaying: boolean;
}

function createAsymmetricTubeCurve(drive = 2.2, asymmetry = 0.15, samples = 2048): Float32Array<ArrayBuffer> {
	const buffer = new ArrayBuffer(samples * 4);
	const curve = new Float32Array(buffer);
	const norm = Math.tanh(drive + asymmetry);
	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / (samples - 1) - 1;
		curve[i] = Math.tanh(drive * x + asymmetry * x * x) / norm;
	}
	return curve;
}

function createWhiteNoiseBuffer(ctx: AudioContext, durationSec = 4): AudioBuffer {
	const length = Math.floor(ctx.sampleRate * durationSec);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) {
		data[i] = Math.random() * 2 - 1;
	}
	return buffer;
}

function createVinylCrackleBuffer(ctx: AudioContext, durationSec = 5): AudioBuffer {
	const length = Math.floor(ctx.sampleRate * durationSec);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);

	let b0 = 0;
	let b1 = 0;
	let b2 = 0;
	for (let i = 0; i < length; i++) {
		const white = Math.random() * 2 - 1;
		b0 = 0.99765 * b0 + white * 0.099046;
		b1 = 0.963 * b1 + white * 0.2965164;
		b2 = 0.57 * b2 + white * 1.0526913;
		let sample = (b0 + b1 + b2 + white * 0.1848) * 0.04;

		if (Math.random() > 0.9991) {
			sample += (Math.random() > 0.5 ? 1 : -1) * (0.22 + Math.random() * 0.42);
		}
		data[i] = Math.max(-1, Math.min(1, sample));
	}
	return buffer;
}

export class CenturyAudioGraph {
	private ctx: AudioContext | null = null;
	private programBus!: GainNode;
	private programCarrierGain!: GainNode;
	private bedGain!: GainNode;
	private staticGain!: GainNode;
	private heterodyneOsc!: OscillatorNode;
	private heterodyneGain!: GainNode;
	private masterWarmupGain!: GainNode;
	private analyser!: AnalyserNode;
	private timeDomainScratch: Float32Array<ArrayBuffer> | null = null;
	private isInitialized = false;
	private isPoweredOn = false;

	private activeMode: StationPreset['programMode'] | null = null;
	private playbackToken = 0;

	// Decoded TTS AudioBuffer playback state
	private currentAudioSource: AudioBufferSourceNode | null = null;
	private activeBufferStartCtxTime = 0;
	private activeBufferDurationSec = 0;
	private audioAbortController: AbortController | null = null;
	private decodedCache = new Map<string, AudioBuffer>();
	private prefetchInFlight = new Map<string, Promise<void>>();

	// Stream HTMLAudioElement state (Great 78rpm)
	private streamElement: HTMLAudioElement | null = null;
	private streamMediaSource: MediaElementAudioSourceNode | null = null;
	private isStreamActive = false;

	// Auxiliary station generators (Morse CW + Arlington NAA 1 Hz Time Signal)
	private auxTimer: number | null = null;
	private morseText = 'CQ CQ DE WCC CHATHAM MASS WIRELESS = PRESS & MARITIME RELAY = AR K';
	private morseEvents: MorseSymbolEvent[] = encodeMorseSymbols(this.morseText);
	private morseCursor = 0;
	private onMorseCharCallback: ((ch: string) => void) | null = null;
	private lastNaaSecond = -1;

	get initialized(): boolean {
		return this.isInitialized;
	}

	setMorseCallback(cb: ((ch: string) => void) | null): void {
		this.onMorseCharCallback = cb;
	}

	setMorseText(text: string): void {
		const clean = text.trim();
		if (!clean || clean === this.morseText) return;
		this.morseText = clean;
		this.morseEvents = encodeMorseSymbols(clean);
		this.morseCursor = 0;
	}

	async ensureUnlocked(): Promise<void> {
		if (this.ctx && this.ctx.state === 'suspended') {
			try {
				await this.ctx.resume();
			} catch {
				// Ignore until next user gesture
			}
		}
	}

	async init(): Promise<void> {
		if (this.isInitialized && this.ctx) {
			if (this.ctx.state === 'suspended') {
				await this.ctx.resume();
			}
			return;
		}

		const AudioCtx =
			window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		const ctx = new AudioCtx();
		this.ctx = ctx;

		// --- Program Bus ---
		this.programBus = ctx.createGain();
		this.programBus.gain.value = 0.92;

		// Carbon Mic / AM Bandpass Chain: HPF 300Hz -> Peak 1.2kHz -> Cascaded LPF 3.5kHz
		const hpf = ctx.createBiquadFilter();
		hpf.type = 'highpass';
		hpf.frequency.value = 300;
		hpf.Q.value = 0.8;

		const peak = ctx.createBiquadFilter();
		peak.type = 'peaking';
		peak.frequency.value = 1200;
		peak.gain.value = 4.0;
		peak.Q.value = 1.4;

		const lpf1 = ctx.createBiquadFilter();
		lpf1.type = 'lowpass';
		lpf1.frequency.value = 3500;
		lpf1.Q.value = 1.0;

		const lpf2 = ctx.createBiquadFilter();
		lpf2.type = 'lowpass';
		lpf2.frequency.value = 3800;
		lpf2.Q.value = 0.8;

		// Wow & Flutter DelayNode (15ms base + 0.4Hz & 5.5Hz LFOs)
		const wowDelay = ctx.createDelay(0.1);
		wowDelay.delayTime.value = 0.015;

		const wowLfo = ctx.createOscillator();
		wowLfo.frequency.value = 0.4;
		const wowDepth = ctx.createGain();
		wowDepth.gain.value = 0.00095;
		wowLfo.connect(wowDepth).connect(wowDelay.delayTime);
		wowLfo.start();

		const flutterLfo = ctx.createOscillator();
		flutterLfo.frequency.value = 5.5;
		const flutterDepth = ctx.createGain();
		flutterDepth.gain.value = 0.00014;
		flutterLfo.connect(flutterDepth).connect(wowDelay.delayTime);
		flutterLfo.start();

		// Tube Warmth WaveShaperNode (Asymmetric saturation)
		const tubeShaper = ctx.createWaveShaper();
		tubeShaper.curve = createAsymmetricTubeCurve(2.1, 0.14);
		tubeShaper.oversample = '4x';

		// Carrier lock attenuation
		this.programCarrierGain = ctx.createGain();
		this.programCarrierGain.gain.value = 0;

		this.programBus
			.connect(hpf)
			.connect(peak)
			.connect(lpf1)
			.connect(lpf2)
			.connect(wowDelay)
			.connect(tubeShaper)
			.connect(this.programCarrierGain);

		// --- Generative Bed (60Hz/120Hz Hum + Vinyl Crackle) ---
		this.bedGain = ctx.createGain();
		this.bedGain.gain.value = 0.0;

		const hum60 = ctx.createOscillator();
		hum60.type = 'sine';
		hum60.frequency.value = 60;
		const hum60Gain = ctx.createGain();
		hum60Gain.gain.value = 0.011;
		hum60.connect(hum60Gain).connect(this.bedGain);
		hum60.start();

		const hum120 = ctx.createOscillator();
		hum120.type = 'sine';
		hum120.frequency.value = 120;
		const hum120Gain = ctx.createGain();
		hum120Gain.gain.value = 0.0045;
		hum120.connect(hum120Gain).connect(this.bedGain);
		hum120.start();

		const crackleSource = ctx.createBufferSource();
		crackleSource.buffer = createVinylCrackleBuffer(ctx, 5);
		crackleSource.loop = true;
		const crackleBp = ctx.createBiquadFilter();
		crackleBp.type = 'bandpass';
		crackleBp.frequency.value = 1800;
		crackleBp.Q.value = 0.9;
		const crackleGain = ctx.createGain();
		crackleGain.gain.value = 0.28;
		crackleSource.connect(crackleBp).connect(crackleGain).connect(this.bedGain);
		crackleSource.start();

		// --- Interactive Tuning Static & Heterodyne Whistle ---
		const staticSource = ctx.createBufferSource();
		staticSource.buffer = createWhiteNoiseBuffer(ctx, 4);
		staticSource.loop = true;
		const staticBp = ctx.createBiquadFilter();
		staticBp.type = 'bandpass';
		staticBp.frequency.value = 1400;
		staticBp.Q.value = 0.7;
		this.staticGain = ctx.createGain();
		this.staticGain.gain.value = 0.16;
		staticSource.connect(staticBp).connect(this.staticGain);
		staticSource.start();

		this.heterodyneOsc = ctx.createOscillator();
		this.heterodyneOsc.type = 'sine';
		this.heterodyneOsc.frequency.value = 800;
		this.heterodyneGain = ctx.createGain();
		this.heterodyneGain.gain.value = 0;
		this.heterodyneOsc.connect(this.heterodyneGain);
		this.heterodyneOsc.start();

		// --- Output Stage: Limiter -> Analyser -> MasterWarmupGain -> Destination ---
		const compressor = ctx.createDynamicsCompressor();
		compressor.threshold.value = -12;
		compressor.knee.value = 12;
		compressor.ratio.value = 4;
		compressor.attack.value = 0.005;
		compressor.release.value = 0.12;

		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 2048;
		this.analyser.smoothingTimeConstant = 0.82;
		this.timeDomainScratch = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));

		this.masterWarmupGain = ctx.createGain();
		this.masterWarmupGain.gain.value = 0;

		this.programCarrierGain.connect(compressor);
		this.bedGain.connect(compressor);
		this.staticGain.connect(compressor);
		this.heterodyneGain.connect(compressor);

		compressor.connect(this.analyser);
		this.analyser.connect(this.masterWarmupGain);
		this.masterWarmupGain.connect(ctx.destination);

		this.isInitialized = true;
	}

	async setPower(on: boolean, volume = 0.8): Promise<void> {
		this.isPoweredOn = on;
		if (on) {
			await this.init();
		}
		if (!this.ctx || !this.isInitialized) return;

		const now = this.ctx.currentTime;
		if (on) {
			if (this.ctx.state === 'suspended') {
				await this.ctx.resume();
			}
			this.masterWarmupGain.gain.cancelScheduledValues(now);
			this.masterWarmupGain.gain.setValueAtTime(this.masterWarmupGain.gain.value, now);
			this.masterWarmupGain.gain.linearRampToValueAtTime(volume, now + 2.4);

			this.bedGain.gain.cancelScheduledValues(now);
			this.bedGain.gain.setTargetAtTime(0.72, now + 0.6, 0.5);
			this.syncAuxiliaryGenerator();
		} else {
			this.masterWarmupGain.gain.cancelScheduledValues(now);
			this.masterWarmupGain.gain.setTargetAtTime(0, now, 0.12);
			this.bedGain.gain.setTargetAtTime(0, now, 0.1);
			this.stopAuxiliaryGenerator();
		}
	}

	setVolume(volume: number): void {
		if (!this.ctx || !this.isInitialized) return;
		this.masterWarmupGain.gain.setTargetAtTime(
			Math.max(0, Math.min(1, volume)),
			this.ctx.currentTime,
			0.04
		);
	}

	updateTuning(lock: SignalLockResult): void {
		if (!this.ctx || !this.isInitialized) return;
		const now = this.ctx.currentTime;
		const s = lock.signalStrength;

		this.programCarrierGain.gain.setTargetAtTime(s, now, 0.03);
		const staticLevel = 0.02 + 0.21 * (1 - Math.pow(s, 1.4));
		this.staticGain.gain.setTargetAtTime(staticLevel, now, 0.03);

		this.heterodyneOsc.frequency.setTargetAtTime(Math.max(120, lock.heterodyneHz), now, 0.02);
		this.heterodyneGain.gain.setTargetAtTime(lock.heterodyneGain * 0.09, now, 0.025);

		const nextMode = lock.nearestStation?.programMode ?? null;
		if (nextMode !== this.activeMode) {
			this.activeMode = nextMode;
			if (this.isPoweredOn) {
				this.syncAuxiliaryGenerator();
			}
		}
	}

	playMechanicalDetentClick(): void {
		if (!this.ctx || !this.isInitialized) return;
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(220, now);
		osc.frequency.exponentialRampToValueAtTime(75, now + 0.018);
		gain.gain.setValueAtTime(0.06, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
		osc.connect(gain).connect(this.masterWarmupGain);
		osc.start(now);
		osc.stop(now + 0.025);
	}

	playStationChime(): void {
		if (!this.ctx || !this.isInitialized) return;
		const notes = [392.0, 659.25, 523.25];
		const now = this.ctx.currentTime;
		notes.forEach((freq, idx) => {
			if (!this.ctx) return;
			const start = now + idx * 0.26;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, start);
			gain.gain.setValueAtTime(0.001, start);
			gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.78);
			osc.connect(gain).connect(this.programBus);
			osc.start(start);
			osc.stop(start + 0.85);
		});
	}

	playVinylNeedleDrop(): void {
		if (!this.ctx || !this.isInitialized) return;
		const now = this.ctx.currentTime;

		// Soft shellac stylus landing thump + brief crackle burst
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(115, now);
		osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.24);
		osc.connect(gain).connect(this.programBus);
		osc.start(now);
		osc.stop(now + 0.26);
	}

	private syncAuxiliaryGenerator(): void {
		this.stopAuxiliaryGenerator();
		if (!this.isPoweredOn || !this.ctx || !this.isInitialized) return;

		if (this.activeMode === 'morse_code') {
			this.runMorseScheduler();
		} else if (this.activeMode === 'time_signal') {
			this.lastNaaSecond = -1;
			this.runTimeSignalScheduler();
		}
	}

	private stopAuxiliaryGenerator(): void {
		if (this.auxTimer !== null) {
			clearTimeout(this.auxTimer);
			this.auxTimer = null;
		}
	}

	private runMorseScheduler(): void {
		if (!this.isPoweredOn || this.activeMode !== 'morse_code' || !this.ctx) return;
		if (this.morseEvents.length === 0) return;

		const ev = this.morseEvents[this.morseCursor % this.morseEvents.length];
		this.morseCursor = (this.morseCursor + 1) % this.morseEvents.length;

		const unitMs = 68;
		const durSec = (ev.units * unitMs) / 1000;

		if (ev.on) {
			const now = this.ctx.currentTime;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(750, now);
			gain.gain.setValueAtTime(0.0005, now);
			gain.gain.linearRampToValueAtTime(0.18, now + 0.004);
			gain.gain.setValueAtTime(0.18, Math.max(now + 0.005, now + durSec - 0.005));
			gain.gain.exponentialRampToValueAtTime(0.0005, now + durSec);
			osc.connect(gain).connect(this.programBus);
			osc.start(now);
			osc.stop(now + durSec + 0.01);
		} else if (ev.emitChar && this.onMorseCharCallback) {
			this.onMorseCharCallback(ev.emitChar);
		}

		this.auxTimer = window.setTimeout(() => this.runMorseScheduler(), ev.units * unitMs);
	}

	private runTimeSignalScheduler(): void {
		if (!this.isPoweredOn || this.activeMode !== 'time_signal' || !this.ctx) return;

		const nowMs = Date.now();
		const sec = new Date(nowMs).getUTCSeconds();

		if (sec !== this.lastNaaSecond) {
			this.lastNaaSecond = sec;
			// Authentic Arlington NAA schedule: silent on second 29 and 55..59, long 1000Hz tone on 00
			if (sec === 0) {
				this.triggerTimePip(true);
			} else if (sec !== 29 && sec < 55) {
				this.triggerTimePip(false);
			}
		}

		const msUntilNextTick = 1000 - (nowMs % 1000) + 6;
		this.auxTimer = window.setTimeout(() => this.runTimeSignalScheduler(), msUntilNextTick);
	}

	private triggerTimePip(accent: boolean): void {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(accent ? 1000 : 880, now);
		const dur = accent ? 0.42 : 0.095;
		gain.gain.setValueAtTime(0.0008, now);
		gain.gain.linearRampToValueAtTime(accent ? 0.25 : 0.16, now + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);
		osc.connect(gain).connect(this.programBus);
		osc.start(now);
		osc.stop(now + dur + 0.02);
	}

	getTimeDomainData(): Float32Array | null {
		if (!this.analyser || !this.timeDomainScratch) return null;
		this.analyser.getFloatTimeDomainData(this.timeDomainScratch);
		return this.timeDomainScratch;
	}

	getRmsLevel(): number {
		const data = this.getTimeDomainData();
		if (!data) return 0;
		let sum = 0;
		for (let i = 0; i < data.length; i += 4) {
			sum += data[i] * data[i];
		}
		return Math.min(1, Math.sqrt(sum / (data.length / 4)) * 3.2);
	}

	getPlaybackProgress(): PlaybackProgress | null {
		if (!this.ctx) return null;

		if (this.isStreamActive && this.streamElement) {
			const dur = Number.isFinite(this.streamElement.duration) ? this.streamElement.duration : 0;
			return {
				currentTime: this.streamElement.currentTime || 0,
				duration: dur,
				isPlaying: !this.streamElement.paused && !this.streamElement.ended
			};
		}

		if (this.currentAudioSource && this.activeBufferDurationSec > 0) {
			const elapsed = Math.max(0, this.ctx.currentTime - this.activeBufferStartCtxTime);
			return {
				currentTime: Math.min(this.activeBufferDurationSec, elapsed),
				duration: this.activeBufferDurationSec,
				isPlaying: elapsed < this.activeBufferDurationSec
			};
		}

		return null;
	}

	stopCurrentAudio(): void {
		this.playbackToken++;
		this.isStreamActive = false;
		this.activeBufferDurationSec = 0;

		if (this.audioAbortController) {
			this.audioAbortController.abort();
			this.audioAbortController = null;
		}
		if (this.currentAudioSource) {
			this.currentAudioSource.onended = null;
			try {
				this.currentAudioSource.stop();
			} catch {
				// Already stopped
			}
			this.currentAudioSource.disconnect();
			this.currentAudioSource = null;
		}
		if (this.streamElement) {
			this.streamElement.onloadedmetadata = null;
			this.streamElement.onended = null;
			this.streamElement.onerror = null;
			this.streamElement.pause();
			this.streamElement.removeAttribute('src');
			this.streamElement.load();
		}
	}

	async prefetchAudioUrl(url: string): Promise<void> {
		if (!this.ctx || !this.isInitialized) return;
		if (this.decodedCache.has(url) || this.prefetchInFlight.has(url)) return;

		const p = (async () => {
			try {
				const res = await fetch(url);
				if (!res.ok || !this.ctx) return;
				const arr = await res.arrayBuffer();
				const decoded = await this.ctx.decodeAudioData(arr);
				this.storeDecodedCache(url, decoded);
			} catch {
				// Non-fatal background warmup
			} finally {
				this.prefetchInFlight.delete(url);
			}
		})();
		this.prefetchInFlight.set(url, p);
	}

	private storeDecodedCache(url: string, buf: AudioBuffer): void {
		if (this.decodedCache.has(url)) {
			this.decodedCache.delete(url);
		}
		this.decodedCache.set(url, buf);
		while (this.decodedCache.size > 4) {
			const oldestKey = this.decodedCache.keys().next().value;
			if (oldestKey) {
				this.decodedCache.delete(oldestKey);
			} else {
				break;
			}
		}
	}

	async playStreamUrl(url: string, opts: AudioPlayOptions = {}): Promise<boolean> {
		if (!this.ctx || !this.isInitialized) return false;
		this.stopCurrentAudio();
		const token = this.playbackToken;

		try {
			if (!this.streamElement) {
				this.streamElement = new Audio();
				this.streamElement.crossOrigin = 'anonymous';
				this.streamElement.preload = 'auto';
				this.streamMediaSource = this.ctx.createMediaElementSource(this.streamElement);
				this.streamMediaSource.connect(this.programBus);
			}

			const el = this.streamElement;
			this.isStreamActive = true;

			el.onloadedmetadata = () => {
				if (token !== this.playbackToken) return;
				const dur = Number.isFinite(el.duration) ? el.duration : 0;
				if (opts.startOffsetSec && opts.startOffsetSec > 1 && dur > opts.startOffsetSec + 3) {
					try {
						el.currentTime = opts.startOffsetSec;
					} catch {
						// Ignore seek error before ready
					}
				}
				if (dur > 0) {
					opts.onLoaded?.(dur);
				}
			};

			el.onended = () => {
				if (token !== this.playbackToken) return;
				this.isStreamActive = false;
				opts.onEnded?.();
			};

			el.onerror = () => {
				if (token !== this.playbackToken) return;
				this.isStreamActive = false;
				opts.onEnded?.();
			};

			el.src = url;
			await el.play();
			return token === this.playbackToken;
		} catch {
			if (token === this.playbackToken) {
				this.isStreamActive = false;
			}
			return false;
		}
	}

	async playAudioUrl(url: string, opts: AudioPlayOptions = {}): Promise<boolean> {
		if (!this.ctx || !this.isInitialized) return false;
		this.stopCurrentAudio();
		const token = this.playbackToken;

		const controller = new AbortController();
		this.audioAbortController = controller;

		try {
			let audioBuffer = this.decodedCache.get(url);
			if (!audioBuffer) {
				const res = await fetch(url, { signal: controller.signal });
				if (!res.ok) return false;
				const arrayBuf = await res.arrayBuffer();
				if (controller.signal.aborted || !this.ctx || token !== this.playbackToken) return false;

				audioBuffer = await this.ctx.decodeAudioData(arrayBuf);
				this.storeDecodedCache(url, audioBuffer);
			}

			if (controller.signal.aborted || !this.ctx || token !== this.playbackToken) return false;

			const source = this.ctx.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(this.programBus);

			const rawOffset = opts.startOffsetSec ?? 0;
			const startOffset =
				rawOffset > 0.5 && rawOffset < Math.max(0.5, audioBuffer.duration - 2) ? rawOffset : 0;

			this.activeBufferDurationSec = audioBuffer.duration;
			this.activeBufferStartCtxTime = this.ctx.currentTime - startOffset;
			opts.onLoaded?.(audioBuffer.duration);

			source.onended = () => {
				if (this.currentAudioSource === source) {
					this.currentAudioSource = null;
					this.activeBufferDurationSec = 0;
				}
				if (token === this.playbackToken) {
					opts.onEnded?.();
				}
			};

			source.start(0, startOffset);
			this.currentAudioSource = source;
			return true;
		} catch {
			return false;
		}
	}

	destroy(): void {
		this.isPoweredOn = false;
		this.stopCurrentAudio();
		this.stopAuxiliaryGenerator();
		if (this.ctx) {
			void this.ctx.close();
			this.ctx = null;
		}
		this.isInitialized = false;
	}
}
