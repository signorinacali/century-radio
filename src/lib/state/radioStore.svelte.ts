import { CenturyAudioGraph } from '$lib/audio/dspGraph';
import { computeCenturyDate, createSampleBroadcastDay } from '$lib/data/sampleBroadcast';
import {
	computeSignalLock,
	DEFAULT_STATIONS,
	DialPhysicsController,
	type SignalLockResult
} from '$lib/physics/dialPhysics';
import type {
	ArchiveTrack,
	BroadcastDay,
	BroadcastSegment,
	StationId,
	StationPreset
} from '$lib/types/broadcast';

export type PowerState = 'OFF' | 'WARMING_UP' | 'ON';
export type AudioPlaybackState =
	| 'idle'
	| 'buffering'
	| 'playing_voice'
	| 'playing_intro'
	| 'playing_78rpm'
	| 'fallback';

export interface KfoxStreamTrack extends ArchiveTrack {
	scheduledOffsetSec: number;
	audioUrl: string;
	archiveUrl: string;
}

class RadioStore {
	power = $state<PowerState>('OFF');
	warmupProgress = $state(0);
	frequencyKHz = $state(710);
	volume = $state(0.8);
	dayOffset = $state(0);
	yearOffset = $state(100);
	isLoadingBroadcast = $state(false);
	ttsStatus = $state<'idle' | 'streaming' | 'fallback'>('idle');
	audioState = $state<AudioPlaybackState>('idle');
	voiceNarration = $state(false);
	liveMode = $state(true);

	activeBroadcastStation = $state<StationId>('wcrn');
	private stationBroadcasts: Record<StationId, BroadcastDay> = $state({
		wcrn: createSampleBroadcastDay(computeCenturyDate(0, 100), 'wcrn'),
		wgn: createSampleBroadcastDay(computeCenturyDate(0, 100), 'wgn')
	});
	private stationSegmentIndices: Record<StationId, number> = $state({
		wcrn: 0,
		wgn: 0
	});

	segmentElapsedSec = $state(0);
	activeTrackDurationSec = $state(0);

	// KFOX-78 Continuous Jukebox State
	kfoxPlaylist = $state<KfoxStreamTrack[]>([]);
	kfoxIndex = $state(0);
	kfoxElapsedSec = $state(0);
	kfoxLoading = $state(false);

	// WCC-MARCONI Live Decoded CW Tape
	morseTape = $state('');

	// NAA-TIME Live Naval Observatory Chronometer
	chronometerUtc = $state('');
	chronometerEst = $state('');
	naaCurrentSecond = $state(0);
	naaPulseActive = $state(false);

	stations: StationPreset[] = DEFAULT_STATIONS;
	signalLock = $state<SignalLockResult>(computeSignalLock(710, DEFAULT_STATIONS));

	readonly audio = new CenturyAudioGraph();
	readonly dial = new DialPhysicsController(710, DEFAULT_STATIONS);

	private rafId: number | null = null;
	private lastFrameMs = 0;
	private warmupTimer: number | null = null;
	private lastTriggeredKey: string | null = null;
	private lastClickBucket = Math.round(710 / 15);
	private loadedDates: Record<StationId, string | null> = { wcrn: null, wgn: null };
	private loadedKfoxKey: string | null = null;

	constructor() {
		this.audio.setMorseCallback((ch) => {
			this.morseTape = (this.morseTape + ch).slice(-140);
		});
		this.updateChronometer();
	}

	get broadcastDay(): BroadcastDay {
		return this.stationBroadcasts[this.activeBroadcastStation];
	}

	get currentSegmentIndex(): number {
		return this.stationSegmentIndices[this.activeBroadcastStation];
	}

	get currentSegment(): BroadcastSegment {
		const list = this.broadcastDay.segments;
		return list[this.currentSegmentIndex] ?? list[0];
	}

	get currentKfoxTrack(): KfoxStreamTrack | null {
		return this.kfoxPlaylist[this.kfoxIndex] ?? null;
	}

	get upcomingKfoxTracks(): KfoxStreamTrack[] {
		if (this.kfoxPlaylist.length <= 1) return [];
		const out: KfoxStreamTrack[] = [];
		for (let i = 1; i <= Math.min(4, this.kfoxPlaylist.length - 1); i++) {
			out.push(this.kfoxPlaylist[(this.kfoxIndex + i) % this.kfoxPlaylist.length]);
		}
		return out;
	}

	get targetCenturyDate(): string {
		return computeCenturyDate(this.dayOffset, this.yearOffset);
	}

	private getStationIdFromLock(lock: SignalLockResult): StationId {
		return lock.nearestStation?.id === 'wgn-midwest' ? 'wgn' : 'wcrn';
	}

	private computeLivePosition(day: BroadcastDay): { index: number; offsetSec: number } {
		if (!day.segments.length || day.totalDurationSec <= 0) {
			return { index: 0, offsetSec: 0 };
		}
		const now = new Date();
		const secSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
		const cyclePos = secSinceMidnight % day.totalDurationSec;

		for (let i = 0; i < day.segments.length; i++) {
			const seg = day.segments[i];
			if (cyclePos < seg.scheduledOffsetSec + seg.durationSec) {
				return {
					index: i,
					offsetSec: Math.max(0, cyclePos - seg.scheduledOffsetSec)
				};
			}
		}
		return { index: 0, offsetSec: 0 };
	}

	async loadBroadcastForDate(targetDate: string, stationId: StationId = this.activeBroadcastStation): Promise<void> {
		this.isLoadingBroadcast = true;
		try {
			const res = await fetch(
				`/api/broadcast?date=${encodeURIComponent(targetDate)}&station=${encodeURIComponent(stationId)}`
			);
			if (res.ok) {
				const day = (await res.json()) as BroadcastDay;
				if (day?.segments?.length > 0) {
					this.stationBroadcasts[stationId] = day;
					this.loadedDates[stationId] = targetDate;

					if (stationId === this.activeBroadcastStation) {
						this.audio.setMorseText(day.morseDispatch);
						if (this.liveMode) {
							const pos = this.computeLivePosition(day);
							this.stationSegmentIndices[stationId] = pos.index;
							this.segmentElapsedSec = pos.offsetSec;
						} else {
							this.stationSegmentIndices[stationId] = 0;
							this.segmentElapsedSec = 0;
						}
						this.lastTriggeredKey = null;
					}
				}
			}
		} catch {
			// Keep fallback broadcastDay if offline
		} finally {
			this.isLoadingBroadcast = false;
			if (this.power === 'ON' && stationId === this.activeBroadcastStation) {
				void this.triggerCurrentModeAudio(this.liveMode ? this.segmentElapsedSec : 0);
			}
		}
	}

	async loadKfoxStream(targetDate: string): Promise<void> {
		const year = Number(targetDate.slice(0, 4)) || 1926;
		const key = `${year}:${targetDate}`;
		if (this.loadedKfoxKey === key && this.kfoxPlaylist.length > 0) return;

		this.kfoxLoading = true;
		try {
			const res = await fetch(
				`/api/music-stream?year=${encodeURIComponent(String(year))}&date=${encodeURIComponent(targetDate)}`
			);
			if (res.ok) {
				const data = (await res.json()) as { tracks?: KfoxStreamTrack[]; totalDurationSec?: number };
				if (data.tracks?.length) {
					this.kfoxPlaylist = data.tracks;
					this.loadedKfoxKey = key;

					if (this.liveMode && data.totalDurationSec && data.totalDurationSec > 0) {
						const now = new Date();
						const secSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
						const cyclePos = secSinceMidnight % data.totalDurationSec;
						const foundIdx = data.tracks.findIndex(
							(t) => cyclePos < t.scheduledOffsetSec + t.durationSec
						);
						this.kfoxIndex = foundIdx >= 0 ? foundIdx : 0;
						const tr = data.tracks[this.kfoxIndex];
						this.kfoxElapsedSec = Math.max(0, cyclePos - tr.scheduledOffsetSec);
					} else {
						this.kfoxIndex = 0;
						this.kfoxElapsedSec = 0;
					}
				}
			}
		} catch {
			// Keep existing playlist if offline
		} finally {
			this.kfoxLoading = false;
			if (this.power === 'ON' && this.signalLock.nearestStation?.programMode === 'music_78') {
				void this.triggerKfoxTrack(this.liveMode ? this.kfoxElapsedSec : 0);
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

			const targetDate = this.targetCenturyDate;
			if (this.loadedDates[this.activeBroadcastStation] !== targetDate) {
				void this.loadBroadcastForDate(targetDate, this.activeBroadcastStation);
			} else if (this.liveMode) {
				const pos = this.computeLivePosition(this.broadcastDay);
				this.stationSegmentIndices[this.activeBroadcastStation] = pos.index;
				this.segmentElapsedSec = pos.offsetSec;
			}
			void this.loadKfoxStream(targetDate);

			const start = performance.now();
			const duration = 2400;
			const tickWarmup = () => {
				if (this.power !== 'WARMING_UP') return;
				const elapsed = performance.now() - start;
				this.warmupProgress = Math.min(1, elapsed / duration);
				if (this.warmupProgress >= 1) {
					this.power = 'ON';
					void this.triggerCurrentModeAudio(this.liveMode ? this.segmentElapsedSec : 0);
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
			this.audioState = 'idle';
			this.lastTriggeredKey = null;
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

	setExactDate(isoDate: string): void {
		const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) return;
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const target = new Date(year, month - 1, day);
		if (Number.isNaN(target.getTime())) return;

		const today = new Date();
		const targetYearOffset = today.getFullYear() - year;
		const shiftedToday = new Date(year, today.getMonth(), today.getDate());
		const diffDays = Math.round((target.getTime() - shiftedToday.getTime()) / 86400000);

		this.yearOffset = targetYearOffset;
		this.dayOffset = diffDays;
		this.reloadForCurrentOffsets();
	}

	private reloadForCurrentOffsets(): void {
		const targetDate = this.targetCenturyDate;
		this.stationBroadcasts.wcrn = createSampleBroadcastDay(targetDate, 'wcrn');
		this.stationBroadcasts.wgn = createSampleBroadcastDay(targetDate, 'wgn');
		this.stationSegmentIndices.wcrn = 0;
		this.stationSegmentIndices.wgn = 0;
		this.loadedDates = { wcrn: null, wgn: null };
		this.loadedKfoxKey = null;
		this.segmentElapsedSec = 0;
		this.lastTriggeredKey = null;
		this.morseTape = '';
		this.audio.stopCurrentAudio();
		this.stopSpeech();
		void this.loadBroadcastForDate(targetDate, this.activeBroadcastStation);
		void this.loadKfoxStream(targetDate);
	}

	syncToLive(): void {
		this.liveMode = true;
		const mode = this.signalLock.nearestStation?.programMode;
		if (mode === 'music_78' && this.kfoxPlaylist.length > 0) {
			const total = this.kfoxPlaylist.reduce((sum, t) => sum + t.durationSec, 0);
			if (total > 0) {
				const now = new Date();
				const cyclePos = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % total;
				const idx = this.kfoxPlaylist.findIndex((t) => cyclePos < t.scheduledOffsetSec + t.durationSec);
				this.kfoxIndex = idx >= 0 ? idx : 0;
				const tr = this.kfoxPlaylist[this.kfoxIndex];
				this.kfoxElapsedSec = Math.max(0, cyclePos - tr.scheduledOffsetSec);
				this.lastTriggeredKey = null;
				if (this.power === 'ON') {
					void this.triggerKfoxTrack(this.kfoxElapsedSec);
				}
			}
			return;
		}

		const pos = this.computeLivePosition(this.broadcastDay);
		this.stationSegmentIndices[this.activeBroadcastStation] = pos.index;
		this.segmentElapsedSec = pos.offsetSec;
		this.lastTriggeredKey = null;
		if (this.power === 'ON') {
			void this.triggerCurrentModeAudio(pos.offsetSec);
		}
	}

	selectSegment(index: number): void {
		if (index < 0 || index >= this.broadcastDay.segments.length) return;
		this.liveMode = false;
		this.stationSegmentIndices[this.activeBroadcastStation] = index;
		this.segmentElapsedSec = 0;
		this.lastTriggeredKey = null;
		if (this.power === 'ON') {
			void this.triggerCurrentModeAudio(0);
		}
	}

	nextSegment(): void {
		const nextIdx = (this.currentSegmentIndex + 1) % this.broadcastDay.segments.length;
		this.selectSegment(nextIdx);
	}

	prevSegment(): void {
		const len = this.broadcastDay.segments.length;
		const prevIdx = (this.currentSegmentIndex - 1 + len) % len;
		this.selectSegment(prevIdx);
	}

	selectKfoxTrack(index: number): void {
		if (index < 0 || index >= this.kfoxPlaylist.length) return;
		this.liveMode = false;
		this.kfoxIndex = index;
		this.kfoxElapsedSec = 0;
		this.lastTriggeredKey = null;
		if (this.power === 'ON') {
			void this.triggerKfoxTrack(0);
		}
	}

	nextKfoxTrack(): void {
		if (this.kfoxPlaylist.length === 0) return;
		this.liveMode = false;
		this.kfoxIndex = (this.kfoxIndex + 1) % this.kfoxPlaylist.length;
		this.kfoxElapsedSec = 0;
		this.lastTriggeredKey = null;
		if (this.power === 'ON') {
			void this.triggerKfoxTrack(0);
		}
	}

	prevKfoxTrack(): void {
		if (this.kfoxPlaylist.length === 0) return;
		this.liveMode = false;
		this.kfoxIndex = (this.kfoxIndex - 1 + this.kfoxPlaylist.length) % this.kfoxPlaylist.length;
		this.kfoxElapsedSec = 0;
		this.lastTriggeredKey = null;
		if (this.power === 'ON') {
			void this.triggerKfoxTrack(0);
		}
	}

	toggleVoiceNarration(): void {
		this.voiceNarration = !this.voiceNarration;
		if (!this.voiceNarration) {
			this.stopSpeech();
		} else {
			this.lastTriggeredKey = null;
			void this.triggerCurrentModeAudio(0);
		}
	}

	private syncFrequency(nextFreq: number): void {
		const prevStationId = this.signalLock.nearestStation?.id ?? null;
		this.frequencyKHz = nextFreq;
		this.signalLock = computeSignalLock(nextFreq, this.stations);
		this.audio.updateTuning(this.signalLock);

		const bucket = Math.round(nextFreq / 15);
		if (bucket !== this.lastClickBucket && this.power !== 'OFF') {
			this.lastClickBucket = bucket;
			this.audio.playMechanicalDetentClick();
		}

		const nextStation = this.signalLock.nearestStation;
		const nextStationId = nextStation?.id ?? null;

		if (this.signalLock.signalStrength < 0.4) {
			this.stopSpeech();
			if (this.audioState !== 'idle') {
				this.audio.stopCurrentAudio();
				this.audioState = 'idle';
				this.lastTriggeredKey = null;
			}
			return;
		}

		// Update active broadcast station when tuning between WCRN (710) and WGN (870)
		if (nextStation?.programMode === 'broadcast') {
			const mapped = this.getStationIdFromLock(this.signalLock);
			if (mapped !== this.activeBroadcastStation) {
				this.activeBroadcastStation = mapped;
				this.segmentElapsedSec = 0;
				this.lastTriggeredKey = null;
				const targetDate = this.targetCenturyDate;
				if (this.loadedDates[mapped] !== targetDate) {
					void this.loadBroadcastForDate(targetDate, mapped);
				} else if (this.liveMode) {
					const pos = this.computeLivePosition(this.broadcastDay);
					this.stationSegmentIndices[mapped] = pos.index;
					this.segmentElapsedSec = pos.offsetSec;
				}
			}
		}

		if (nextStationId !== prevStationId && this.power === 'ON' && this.signalLock.signalStrength >= 0.55) {
			this.lastTriggeredKey = null;
			void this.triggerCurrentModeAudio(this.liveMode ? this.segmentElapsedSec : 0);
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

			this.updateChronometer();

			if (this.power === 'ON') {
				this.advanceSchedule(dtSec);
			}

			this.rafId = requestAnimationFrame(frame);
		};

		this.rafId = requestAnimationFrame(frame);
	}

	private updateChronometer(): void {
		const now = new Date();
		const utcSec = now.getUTCSeconds();
		this.naaCurrentSecond = utcSec;
		this.naaPulseActive = utcSec !== 29 && utcSec < 55 && now.getUTCMilliseconds() < 160;
		this.chronometerUtc = now.toISOString().slice(11, 19);
		const estDate = new Date(now.getTime() - 5 * 3600 * 1000);
		this.chronometerEst = estDate.toISOString().slice(11, 19);
	}

	private advanceSchedule(dtSec: number): void {
		const mode = this.signalLock.nearestStation?.programMode;
		const progress = this.audio.getPlaybackProgress();

		if (mode === 'music_78') {
			if (progress) {
				this.kfoxElapsedSec = progress.currentTime;
				if (progress.duration > 0) {
					this.activeTrackDurationSec = progress.duration;
				}
			} else if (this.currentKfoxTrack && this.audioState === 'fallback') {
				this.kfoxElapsedSec += dtSec;
				if (this.kfoxElapsedSec >= this.currentKfoxTrack.durationSec) {
					this.nextKfoxTrack();
				}
			}
			return;
		}

		if (mode !== 'broadcast') return;

		if (progress && this.audioState !== 'fallback') {
			this.segmentElapsedSec = progress.currentTime;
			if (progress.duration > 0) {
				this.activeTrackDurationSec = progress.duration;
			}
			return;
		}

		// Only use estimated timer advance when operating in silent/browser-speech fallback mode
		if (this.audioState === 'fallback') {
			const seg = this.currentSegment;
			this.segmentElapsedSec += dtSec;
			if (this.segmentElapsedSec >= seg.durationSec) {
				this.advanceToNextSegment();
			}
		}
	}

	private advanceToNextSegment(): void {
		const nextIdx = (this.currentSegmentIndex + 1) % this.broadcastDay.segments.length;
		const nextSeg = this.broadcastDay.segments[nextIdx];
		this.stationSegmentIndices[this.activeBroadcastStation] = nextIdx;
		this.segmentElapsedSec = 0;
		this.activeTrackDurationSec = 0;
		this.lastTriggeredKey = null;

		if (
			nextSeg &&
			['STATION_ID', 'RADIO_DRAMA', 'VARIETY_HOUR', 'CONCERT_HALL', 'NEWS_BULLETIN'].includes(nextSeg.type)
		) {
			this.audio.playStationChime();
		}
		void this.triggerCurrentModeAudio(0);
	}

	private prefetchNextSegment(): void {
		const list = this.broadcastDay.segments;
		if (list.length <= 1) return;
		const nextSeg = list[(this.currentSegmentIndex + 1) % list.length];
		if (!nextSeg) return;
		const warmUrl = nextSeg.introAudioUrl || (nextSeg.audio.sourceType === 'tts_blob' ? nextSeg.audio.url : null);
		if (warmUrl && warmUrl.startsWith('/api/tts')) {
			void this.audio.prefetchAudioUrl(warmUrl);
		}
	}

	private async triggerKfoxTrack(startOffsetSec = 0): Promise<void> {
		if (this.power !== 'ON') return;
		if (this.kfoxPlaylist.length === 0) {
			await this.loadKfoxStream(this.targetCenturyDate);
			return;
		}
		const track = this.currentKfoxTrack;
		if (!track) return;

		const key = `kfox:${track.identifier}:${this.kfoxIndex}`;
		if (this.lastTriggeredKey === key) return;
		this.lastTriggeredKey = key;

		this.stopSpeech();
		this.audio.stopCurrentAudio();
		this.ttsStatus = 'streaming';
		this.audioState = 'buffering';
		this.activeTrackDurationSec = track.durationSec;

		if (startOffsetSec < 1) {
			this.audio.playVinylNeedleDrop();
		}

		const started = await this.audio.playStreamUrl(track.audioUrl, {
			startOffsetSec,
			onLoaded: (dur) => {
				this.activeTrackDurationSec = dur;
				this.audioState = 'playing_78rpm';
			},
			onEnded: () => {
				if (this.power === 'ON' && this.signalLock.nearestStation?.programMode === 'music_78') {
					this.kfoxIndex = (this.kfoxIndex + 1) % this.kfoxPlaylist.length;
					this.kfoxElapsedSec = 0;
					this.lastTriggeredKey = null;
					void this.triggerKfoxTrack(0);
				}
			}
		});

		if (started) {
			this.audioState = 'playing_78rpm';
		} else {
			this.audioState = 'fallback';
			this.ttsStatus = 'fallback';
		}
	}

	private async triggerCurrentModeAudio(startOffsetSec = 0): Promise<void> {
		if (this.power !== 'ON') return;
		const mode = this.signalLock.nearestStation?.programMode;
		if (!mode || this.signalLock.signalStrength < 0.5) {
			return;
		}

		if (mode === 'morse_code') {
			this.audio.setMorseText(this.broadcastDay.morseDispatch);
			this.audio.stopCurrentAudio();
			this.stopSpeech();
			this.audioState = 'idle';
			return;
		}

		if (mode === 'time_signal') {
			this.audio.stopCurrentAudio();
			this.stopSpeech();
			this.audioState = 'idle';
			return;
		}

		if (mode === 'music_78') {
			await this.triggerKfoxTrack(startOffsetSec);
			return;
		}

		// Broadcast mode (WCRN-AM or WGN-MIDWEST)
		const seg = this.currentSegment;
		const key = `${this.activeBroadcastStation}:${this.broadcastDay.id}:${seg.id}`;
		if (this.lastTriggeredKey === key) return;
		this.lastTriggeredKey = key;

		this.stopSpeech();
		this.audio.stopCurrentAudio();
		this.activeTrackDurationSec = seg.durationSec;

		if (seg.audio.sourceType === 'internet_archive') {
			this.ttsStatus = 'streaming';
			const playArchivePart = async (archiveOffset = 0) => {
				if (this.power !== 'ON' || this.lastTriggeredKey !== key) return;
				this.audioState = 'buffering';
				if (archiveOffset < 1) {
					this.audio.playVinylNeedleDrop();
				}
				const streamed = await this.audio.playStreamUrl(seg.audio.url, {
					startOffsetSec: archiveOffset,
					onLoaded: (dur) => {
						this.activeTrackDurationSec = dur;
						this.audioState = 'playing_78rpm';
					},
					onEnded: () => {
						if (this.power === 'ON' && this.lastTriggeredKey === key) {
							this.advanceToNextSegment();
						}
					}
				});
				if (streamed) {
					this.audioState = 'playing_78rpm';
					this.prefetchNextSegment();
				} else if (this.lastTriggeredKey === key) {
					this.audioState = 'fallback';
					this.ttsStatus = 'fallback';
				}
			};

			// Play announcer intro before spinning the 78rpm record unless seeking past intro
			if (seg.introAudioUrl && startOffsetSec < 14) {
				this.audioState = 'buffering';
				const playedIntro = await this.audio.playAudioUrl(seg.introAudioUrl, {
					startOffsetSec,
					onLoaded: (dur) => {
						this.activeTrackDurationSec = dur;
						this.audioState = 'playing_intro';
					},
					onEnded: () => {
						if (this.power === 'ON' && this.lastTriggeredKey === key) {
							void playArchivePart(0);
						}
					}
				});
				if (playedIntro) {
					this.audioState = 'playing_intro';
					return;
				}
			}

			await playArchivePart(Math.max(0, startOffsetSec - 14));
			return;
		}

		if (seg.audio.sourceType === 'tts_blob' && seg.audio.url.startsWith('/api/tts')) {
			this.ttsStatus = 'streaming';
			this.audioState = 'buffering';
			const played = await this.audio.playAudioUrl(seg.audio.url, {
				startOffsetSec,
				onLoaded: (dur) => {
					this.activeTrackDurationSec = dur;
					this.audioState = 'playing_voice';
				},
				onEnded: () => {
					if (this.power === 'ON' && this.lastTriggeredKey === key) {
						this.advanceToNextSegment();
					}
				}
			});
			if (played) {
				this.audioState = 'playing_voice';
				this.prefetchNextSegment();
				return;
			}
		}

		this.ttsStatus = 'fallback';
		this.audioState = 'fallback';
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
