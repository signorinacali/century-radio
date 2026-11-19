import type { StationPreset } from '$lib/types/broadcast';
import type { SignalLockResult } from '$lib/physics/dialPhysics';

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

	// Voss-style pink-ish noise + sparse 78rpm dust impulses
	let b0 = 0;
	let b1 = 0;
	let b2 = 0;
	for (let i = 0; i < length; i++) {
		const white = Math.random() * 2 - 1;
		b0 = 0.99765 * b0 + white * 0.099046;
		b1 = 0.963 * b1 + white * 0.2965164;
		b2 = 0.57 * b2 + white * 1.0526913;
		let sample = (b0 + b1 + b2 + white * 0.1848) * 0.04;

		// Sparse shellac pops/clicks
		if (Math.random() > 0.9991) {
			sample += (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.45);
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
	private demoStepTimer: number | null = null;
	private stepCount = 0;
	private activeMode: StationPreset['programMode'] | null = null;
	private currentAudioSource: AudioBufferSourceNode | null = null;
	private audioAbortController: AbortController | null = null;
	private streamElement: HTMLAudioElement | null = null;
	private streamMediaSource: MediaElementAudioSourceNode | null = null;

	get initialized(): boolean {
		return this.isInitialized;
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

		const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		const ctx = new AudioCtx();
		this.ctx = ctx;

		// --- Program Bus ---
		this.programBus = ctx.createGain();
		this.programBus.gain.value = 0.9;

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
		wowDepth.gain.value = 0.0011;
		wowLfo.connect(wowDepth).connect(wowDelay.delayTime);
		wowLfo.start();

		const flutterLfo = ctx.createOscillator();
		flutterLfo.frequency.value = 5.5;
		const flutterDepth = ctx.createGain();
		flutterDepth.gain.value = 0.00016;
		flutterLfo.connect(flutterDepth).connect(wowDelay.delayTime);
		flutterLfo.start();

		// Tube Warmth WaveShaperNode (Asymmetric saturation)
		const tubeShaper = ctx.createWaveShaper();
		tubeShaper.curve = createAsymmetricTubeCurve(2.2, 0.15);
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
		hum60Gain.gain.value = 0.012; // ~ -38 dB
		hum60.connect(hum60Gain).connect(this.bedGain);
		hum60.start();

		const hum120 = ctx.createOscillator();
		hum120.type = 'sine';
		hum120.frequency.value = 120;
		const hum120Gain = ctx.createGain();
		hum120Gain.gain.value = 0.005;
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
		crackleGain.gain.value = 0.35;
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
		this.staticGain.gain.value = 0.18;
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
		if (on) {
			await this.init();
		}
		if (!this.ctx || !this.isInitialized) return;

		const now = this.ctx.currentTime;
		if (on) {
			if (this.ctx.state === 'suspended') {
				await this.ctx.resume();
			}
			// 2.5s tube filament warm-up ramp
			this.masterWarmupGain.gain.cancelScheduledValues(now);
			this.masterWarmupGain.gain.setValueAtTime(this.masterWarmupGain.gain.value, now);
			this.masterWarmupGain.gain.linearRampToValueAtTime(volume, now + 2.4);

			this.bedGain.gain.cancelScheduledValues(now);
			this.bedGain.gain.setTargetAtTime(0.85, now + 0.6, 0.5);
			this.startDemoGenerator();
		} else {
			this.masterWarmupGain.gain.cancelScheduledValues(now);
			this.masterWarmupGain.gain.setTargetAtTime(0, now, 0.12);
			this.bedGain.gain.setTargetAtTime(0, now, 0.1);
			this.stopDemoGenerator();
		}
	}

	setVolume(volume: number): void {
		if (!this.ctx || !this.isInitialized) return;
		this.masterWarmupGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.04);
	}

	updateTuning(lock: SignalLockResult): void {
		if (!this.ctx || !this.isInitialized) return;
		const now = this.ctx.currentTime;
		const s = lock.signalStrength;

		// Crossfade program vs white-noise static
		this.programCarrierGain.gain.setTargetAtTime(s, now, 0.03);
		const staticLevel = 0.025 + 0.22 * (1 - Math.pow(s, 1.4));
		this.staticGain.gain.setTargetAtTime(staticLevel, now, 0.03);

		// Heterodyne beat whistle
		this.heterodyneOsc.frequency.setTargetAtTime(Math.max(120, lock.heterodyneHz), now, 0.02);
		this.heterodyneGain.gain.setTargetAtTime(lock.heterodyneGain * 0.09, now, 0.025);

		this.activeMode = lock.nearestStation?.programMode ?? null;
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
		// Classic 1920s 3-note network chime (G4 - E5 - C5)
		const notes = [392.0, 659.25, 523.25];
		const now = this.ctx.currentTime;
		notes.forEach((freq, idx) => {
			if (!this.ctx) return;
			const start = now + idx * 0.28;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, start);
			gain.gain.setValueAtTime(0.001, start);
			gain.gain.linearRampToValueAtTime(0.24, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.9);
			osc.connect(gain).connect(this.programBus);
			osc.start(start);
			osc.stop(start + 0.95);
		});
	}

	private startDemoGenerator(): void {
		if (this.demoStepTimer !== null) return;
		this.demoStepTimer = window.setInterval(() => {
			if (!this.ctx || !this.isInitialized || !this.activeMode) return;
			this.stepCount++;

			if (this.activeMode === 'time_signal') {
				this.triggerTimePip(this.stepCount % 5 === 0);
			} else if (this.activeMode === 'music_78') {
				this.triggerRagtimeNote(this.stepCount);
			} else if (this.activeMode === 'morse_code') {
				const pattern = [true, false, false, true, false, true, true, false, false, true];
				if (this.stepCount % 3 !== 0) {
					this.triggerMorseElement(pattern[this.stepCount % pattern.length]);
				}
			} else if (this.activeMode === 'broadcast') {
				// Subtle telegraph/ragtime bed under spoken broadcast simulation
				if (this.stepCount % 16 === 1) {
					this.playStationChime();
				} else if (this.stepCount % 2 === 0) {
					this.triggerRagtimeNote(this.stepCount, 0.08);
				}
			}
		}, 420);
	}

	private stopDemoGenerator(): void {
		if (this.demoStepTimer !== null) {
			clearInterval(this.demoStepTimer);
			this.demoStepTimer = null;
		}
	}

	private triggerTimePip(accent: boolean): void {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(accent ? 1000 : 880, now);
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(accent ? 0.25 : 0.15, now + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0005, now + (accent ? 0.32 : 0.11));
		osc.connect(gain).connect(this.programBus);
		osc.start(now);
		osc.stop(now + 0.35);
	}

	private triggerMorseElement(isDah: boolean): void {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(750, now);
		const dur = isDah ? 0.22 : 0.08;
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
		gain.gain.setValueAtTime(0.18, now + dur - 0.005);
		gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);
		osc.connect(gain).connect(this.programBus);
		osc.start(now);
		osc.stop(now + dur + 0.01);
	}

	private triggerRagtimeNote(step: number, level = 0.16): void {
		if (!this.ctx) return;
		// 1920s stride/ragtime chord progression (C6 - A7 - D9 - G7)
		const progression = [
			[261.63, 329.63, 440.0],
			[220.0, 277.18, 392.0],
			[293.66, 369.99, 440.0],
			[196.0, 246.94, 349.23]
		];
		const chord = progression[Math.floor(step / 4) % progression.length];
		const freq = chord[step % chord.length] * (step % 2 === 0 ? 1 : 2);
		const now = this.ctx.currentTime;

		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(freq, now);
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(level, now + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);
		osc.connect(gain).connect(this.programBus);
		osc.start(now);
		osc.stop(now + 0.38);
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

	stopCurrentAudio(): void {
		if (this.audioAbortController) {
			this.audioAbortController.abort();
			this.audioAbortController = null;
		}
		if (this.currentAudioSource) {
			try {
				this.currentAudioSource.stop();
			} catch {
				// Already stopped
			}
			this.currentAudioSource.disconnect();
			this.currentAudioSource = null;
		}
		if (this.streamElement) {
			this.streamElement.pause();
			this.streamElement.removeAttribute('src');
			this.streamElement.load();
		}
	}

	async playStreamUrl(url: string): Promise<boolean> {
		if (!this.ctx || !this.isInitialized) return false;
		this.stopCurrentAudio();

		try {
			if (!this.streamElement) {
				this.streamElement = new Audio();
				this.streamElement.crossOrigin = 'anonymous';
				this.streamMediaSource = this.ctx.createMediaElementSource(this.streamElement);
				this.streamMediaSource.connect(this.programBus);
			}
			this.streamElement.src = url;
			await this.streamElement.play();
			return true;
		} catch {
			return false;
		}
	}

	async playAudioUrl(url: string): Promise<boolean> {
		if (!this.ctx || !this.isInitialized) return false;
		this.stopCurrentAudio();

		const controller = new AbortController();
		this.audioAbortController = controller;

		try {
			const res = await fetch(url, { signal: controller.signal });
			if (!res.ok) return false;
			const arrayBuf = await res.arrayBuffer();
			if (controller.signal.aborted || !this.ctx) return false;

			const audioBuffer = await this.ctx.decodeAudioData(arrayBuf);
			if (controller.signal.aborted || !this.ctx) return false;

			const source = this.ctx.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(this.programBus);
			source.onended = () => {
				if (this.currentAudioSource === source) {
					this.currentAudioSource = null;
				}
			};
			source.start();
			this.currentAudioSource = source;
			return true;
		} catch {
			return false;
		}
	}

	destroy(): void {
		this.stopCurrentAudio();
		this.stopDemoGenerator();
		if (this.ctx) {
			void this.ctx.close();
			this.ctx = null;
		}
		this.isInitialized = false;
	}
}
