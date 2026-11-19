import { CenturyAudioGraph } from '$lib/audio/dspGraph';
import { computeCenturyDate, createSampleBroadcastDay } from '$lib/data/sampleBroadcast';
import {
	computeSignalLock,
	DEFAULT_STATIONS,
	DialPhysicsController,
	type SignalLockResult
} from '$lib/physics/dialPhysics';
import type { BroadcastDay, BroadcastSegment, StationPreset } from '$lib/types/broadcast';

export type PowerState = 'OFF' | 'WARMING_UP' | 'ON';

class RadioStore {
	power = $state<PowerState>('OFF');
	warmupProgress = $state(0);
	frequencyKHz = $state(710);
	volume = $state(0.8);
	dayOffset = $state(0);
	yearOffset = $state(100);
	isLoadingBroadcast = $state(false);
	ttsStatus = $state<'idle' | 'streaming' | 'fallback'>('idle');
	voiceNarration = $state(false);

	broadcastDay = $state<BroadcastDay>(createSampleBroadcastDay(computeCenturyDate(0, 100)));
	currentSegmentIndex = $state(0);
	segmentElapsedSec = $state(0);

	stations: StationPreset[] = DEFAULT_STATIONS;
	signalLock = $state<SignalLockResult>(computeSignalLock(710, DEFAULT_STATIONS));

	readonly audio = new CenturyAudioGraph();
	readonly dial = new DialPhysicsController(710, DEFAULT_STATIONS);

	private rafId: number | null = null;
	private lastFrameMs = 0;
	private warmupTimer: number | null = null;
	private lastTriggeredSegmentId: string | null = null;
	private lastClickBucket = Math.round(710 / 15);
	private hasFetchedInitial = false;

	get currentSegment(): BroadcastSegment {
		return this.broadcastDay.segments[this.currentSegmentIndex] ?? this.broadcastDay.segments[0];
	}

	async loadBroadcastForDate(targetDate: string): Promise<void> {
		this.isLoadingBroadcast = true;
		try {
			const res = await fetch(`/api/broadcast?date=${encodeURIComponent(targetDate)}`);
			if (res.ok) {
				const day = (await res.json()) as BroadcastDay;
				if (day?.segments?.length > 0) {
					this.broadcastDay = day;
					this.currentSegmentIndex = 0;
					this.segmentElapsedSec = 0;
					this.lastTriggeredSegmentId = null;
				}
			}
		} catch {
			// Keep existing broadcastDay if offline
		} finally {
			this.isLoadingBroadcast = false;
			if (this.power === 'ON') {
				void this.triggerCurrentSegmentAudio();
			}
		}
	}

	async togglePower(): Promise<void> {
		if (this.power === 'OFF') {
			this.power = 'WARMING_UP';
			this.warmupProgress = 0;
			await this.audio.setPower(true, this.volume);
			this.audio.updateTuning(this.signalLock);
			this.startLoop();

			if (!this.hasFetchedInitial) {
				this.hasFetchedInitial = true;
				void this.loadBroadcastForDate(this.broadcastDay.id);
			}

			const start = performance.now();
			const duration = 2400;
			const tickWarmup = () => {
				if (this.power !== 'WARMING_UP') return;
				const elapsed = performance.now() - start;
				this.warmupProgress = Math.min(1, elapsed / duration);
				if (this.warmupProgress >= 1) {
					this.power = 'ON';
					void this.triggerCurrentSegmentAudio();
				} else {
					this.warmupTimer = window.setTimeout(tickWarmup, 40);
				}
			};
			tickWarmup();
		} else {
			if (this.warmupTimer !== null) {
				clearTimeout(this.warmupTimer);
				this.warmupTimer = null;
			}
			this.power = 'OFF';
			this.warmupProgress = 0;
			this.ttsStatus = 'idle';
			this.audio.stopCurrentAudio();
			this.stopSpeech();
			await this.audio.setPower(false);
		}
	}

	setVolume(vol: number): void {
		this.volume = Math.max(0, Math.min(1, vol));
		if (this.power !== 'OFF') {
			this.audio.setVolume(this.volume);
		}
	}

	setFrequency(freqKHz: number, fromUserSlider = false): void {
		const next = this.dial.setFrequency(freqKHz, fromUserSlider);
		this.syncFrequency(next);
	}

	applyDialImpulse(deltaKHzPerSec: number): void {
		this.dial.applyImpulse(deltaKHzPerSec);
	}

	setDragging(dragging: boolean): void {
		this.dial.setDragging(dragging);
	}

	tuneToStation(station: StationPreset): void {
		this.dial.setFrequency(station.frequencyKHz, true);
		this.syncFrequency(station.frequencyKHz);
		if (this.power !== 'OFF') {
			this.audio.playMechanicalDetentClick();
		}
	}

	shiftDay(delta: number): void {
		this.dayOffset += delta;
		this.reloadForCurrentOffsets();
	}

	setYearOffset(offset: number): void {
		if (this.yearOffset === offset) return;
		this.yearOffset = offset;
		this.reloadForCurrentOffsets();
	}

	private reloadForCurrentOffsets(): void {
		const targetDate = computeCenturyDate(this.dayOffset, this.yearOffset);
		this.broadcastDay = createSampleBroadcastDay(targetDate);
		this.currentSegmentIndex = 0;
		this.segmentElapsedSec = 0;
		this.lastTriggeredSegmentId = null;
		this.audio.stopCurrentAudio();
		this.stopSpeech();
		void this.loadBroadcastForDate(targetDate);
	}

	selectSegment(index: number): void {
		if (index < 0 || index >= this.broadcastDay.segments.length) return;
		this.currentSegmentIndex = index;
		this.segmentElapsedSec = 0;
		this.lastTriggeredSegmentId = null;
		void this.triggerCurrentSegmentAudio();
	}

	toggleVoiceNarration(): void {
		this.voiceNarration = !this.voiceNarration;
		if (!this.voiceNarration) {
			this.stopSpeech();
		} else {
			this.lastTriggeredSegmentId = null;
			void this.triggerCurrentSegmentAudio();
		}
	}

	private syncFrequency(nextFreq: number): void {
		this.frequencyKHz = nextFreq;
		this.signalLock = computeSignalLock(nextFreq, this.stations);
		this.audio.updateTuning(this.signalLock);

		const bucket = Math.round(nextFreq / 15);
		if (bucket !== this.lastClickBucket && this.power !== 'OFF') {
			this.lastClickBucket = bucket;
			this.audio.playMechanicalDetentClick();
		}

		if (this.signalLock.signalStrength < 0.4) {
			this.stopSpeech();
		}
	}

	private startLoop(): void {
		if (this.rafId !== null) return;
		this.lastFrameMs = performance.now();

		const frame = (now: number) => {
			const dtSec = Math.min(0.1, (now - this.lastFrameMs) / 1000);
			this.lastFrameMs = now;

			if (this.dial.step(dtSec)) {
				this.syncFrequency(this.dial.frequencyKHz);
			}

			if (this.power === 'ON') {
				this.advanceSchedule(dtSec);
			}

			this.rafId = requestAnimationFrame(frame);
		};

		this.rafId = requestAnimationFrame(frame);
	}

	private advanceSchedule(dtSec: number): void {
		const seg = this.currentSegment;
		this.segmentElapsedSec += dtSec;
		if (this.segmentElapsedSec >= seg.durationSec) {
			this.segmentElapsedSec = 0;
			this.currentSegmentIndex = (this.currentSegmentIndex + 1) % this.broadcastDay.segments.length;
			this.lastTriggeredSegmentId = null;
			void this.triggerCurrentSegmentAudio();
		}
	}

	private async triggerCurrentSegmentAudio(): Promise<void> {
		if (this.power !== 'ON') return;
		const mode = this.signalLock.nearestStation?.programMode;
		if (!mode || this.signalLock.signalStrength < 0.5) {
			return;
		}

		if (mode === 'music_78') {
			const musicSeg = this.broadcastDay.segments.find((s) => s.audio.sourceType === 'internet_archive');
			if (musicSeg) {
				const key = `kfox:${musicSeg.audio.url}`;
				if (this.lastTriggeredSegmentId === key) return;
				this.lastTriggeredSegmentId = key;
				this.stopSpeech();
				await this.audio.playStreamUrl(musicSeg.audio.url);
			}
			return;
		}

		if (mode !== 'broadcast') return;

		const seg = this.currentSegment;
		const key = `${this.broadcastDay.id}:${seg.id}`;
		if (this.lastTriggeredSegmentId === key) return;
		this.lastTriggeredSegmentId = key;

		this.stopSpeech();
		this.audio.stopCurrentAudio();

		if (seg.audio.sourceType === 'internet_archive') {
			this.ttsStatus = 'streaming';
			const streamed = await this.audio.playStreamUrl(seg.audio.url);
			if (streamed) return;
		} else if (seg.audio.sourceType === 'tts_blob' && seg.audio.url.startsWith('/api/tts')) {
			this.ttsStatus = 'streaming';
			const played = await this.audio.playAudioUrl(seg.audio.url);
			if (played) return;
		}

		this.ttsStatus = 'fallback';
		this.maybeSpeakFallback(seg);
	}

	private maybeSpeakFallback(seg: BroadcastSegment): void {
		if (!this.voiceNarration || typeof window === 'undefined' || !('speechSynthesis' in window)) {
			return;
		}
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(seg.scriptText);
		utterance.rate = 0.94;
		utterance.pitch = 0.85;
		window.speechSynthesis.speak(utterance);
	}

	private stopSpeech(): void {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			window.speechSynthesis.cancel();
		}
	}

	destroy(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		if (this.warmupTimer !== null) {
			clearTimeout(this.warmupTimer);
		}
		this.stopSpeech();
		this.audio.destroy();
	}
}

export const radio = new RadioStore();
