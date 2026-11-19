import type { StationPreset } from '$lib/types/broadcast';

export const AM_MIN_KHZ = 550;
export const AM_MAX_KHZ = 1600;
export const CARRIER_BANDWIDTH_KHZ = 35;
export const DETENT_RANGE_KHZ = 7;

export const DEFAULT_STATIONS: StationPreset[] = [
	{
		id: 'wcc-marconi',
		callsign: 'WCC-MARCONI',
		label: 'Chatham Wireless • Transatlantic Morse',
		frequencyKHz: 640,
		programMode: 'morse_code'
	},
	{
		id: 'wcrn-main',
		callsign: 'WCRN-AM',
		label: 'Century Radio • New York',
		frequencyKHz: 710,
		programMode: 'broadcast'
	},
	{
		id: 'wgn-midwest',
		callsign: 'WGN-MIDWEST',
		label: 'WGN Chicago • Midwest News & Concert',
		frequencyKHz: 870,
		programMode: 'broadcast'
	},
	{
		id: 'usno-time',
		callsign: 'NAA-TIME',
		label: 'Naval Observatory Time Signal',
		frequencyKHz: 980,
		programMode: 'time_signal'
	},
	{
		id: 'kfox-78',
		callsign: 'KFOX-78',
		label: 'Late Night 78rpm Ballroom',
		frequencyKHz: 1240,
		programMode: 'music_78'
	}
];

export interface SignalLockResult {
	nearestStation: StationPreset | null;
	distanceKHz: number;
	signalStrength: number; // 0..1
	heterodyneHz: number;
	heterodyneGain: number; // 0..1
}

export function clampFrequency(freqKHz: number): number {
	return Math.min(AM_MAX_KHZ, Math.max(AM_MIN_KHZ, freqKHz));
}

export function computeSignalLock(
	frequencyKHz: number,
	stations: StationPreset[] = DEFAULT_STATIONS
): SignalLockResult {
	let nearestStation: StationPreset | null = null;
	let minAbsDist = Infinity;

	for (const station of stations) {
		const dist = Math.abs(frequencyKHz - station.frequencyKHz);
		if (dist < minAbsDist) {
			minAbsDist = dist;
			nearestStation = station;
		}
	}

	if (!nearestStation || minAbsDist > CARRIER_BANDWIDTH_KHZ) {
		return {
			nearestStation: null,
			distanceKHz: minAbsDist,
			signalStrength: 0,
			heterodyneHz: 0,
			heterodyneGain: 0
		};
	}

	// Gaussian carrier lock curve (sigma = 8.5 kHz)
	const sigma = 8.5;
	const signalStrength = Math.exp(-(minAbsDist * minAbsDist) / (2 * sigma * sigma));

	// Heterodyne beat whistle sweeps from 0 Hz (zero-beat) up to ~4.2 kHz
	const heterodyneHz = Math.min(4200, minAbsDist * 120);

	// Whistle peaks around +/- 7 kHz off-center and vanishes at exact lock (< 0.8 kHz)
	let heterodyneGain = 0;
	if (minAbsDist >= 0.8 && minAbsDist <= CARRIER_BANDWIDTH_KHZ) {
		const peakDist = 7;
		const spread = 11;
		heterodyneGain =
			0.85 * Math.exp(-((minAbsDist - peakDist) * (minAbsDist - peakDist)) / (2 * spread * spread));
	}

	return {
		nearestStation: signalStrength > 0.12 ? nearestStation : null,
		distanceKHz: minAbsDist,
		signalStrength,
		heterodyneHz,
		heterodyneGain
	};
}

export class DialPhysicsController {
	frequencyKHz: number;
	velocityKHzPerSec = 0;
	isDragging = false;
	private stations: StationPreset[];

	constructor(initialFrequencyKHz = 710, stations: StationPreset[] = DEFAULT_STATIONS) {
		this.frequencyKHz = clampFrequency(initialFrequencyKHz);
		this.stations = stations;
	}

	setFrequency(freqKHz: number, resetVelocity = false): number {
		this.frequencyKHz = clampFrequency(freqKHz);
		if (resetVelocity) {
			this.velocityKHzPerSec = 0;
		}
		return this.frequencyKHz;
	}

	applyImpulse(deltaKHzPerSec: number): void {
		this.velocityKHzPerSec += deltaKHzPerSec;
	}

	setDragging(dragging: boolean): void {
		this.isDragging = dragging;
		if (dragging) {
			this.velocityKHzPerSec = 0;
		}
	}

	/**
	 * Advances inertia + magnetic station detent physics by dtSec.
	 * Returns true if the frequency changed meaningfully.
	 */
	step(dtSec: number): boolean {
		if (this.isDragging || dtSec <= 0) return false;
		const clampedDt = Math.min(dtSec, 0.05);
		const prev = this.frequencyKHz;

		// Apply velocity
		this.frequencyKHz = clampFrequency(this.frequencyKHz + this.velocityKHzPerSec * clampedDt);

		// Exponential friction decay
		const damping = Math.pow(0.08, clampedDt);
		this.velocityKHzPerSec *= damping;

		// Magnetic detent pull when coasting slowly near a station carrier
		if (Math.abs(this.velocityKHzPerSec) < 35) {
			for (const station of this.stations) {
				const diff = station.frequencyKHz - this.frequencyKHz;
				if (Math.abs(diff) <= DETENT_RANGE_KHZ && Math.abs(diff) > 0.05) {
					this.frequencyKHz += diff * Math.min(1, clampedDt * 8.5);
					break;
				}
			}
		}

		if (Math.abs(this.velocityKHzPerSec) < 0.2) {
			this.velocityKHzPerSec = 0;
		}

		// Bounce/stop at band edges
		if (this.frequencyKHz === AM_MIN_KHZ || this.frequencyKHz === AM_MAX_KHZ) {
			this.velocityKHzPerSec = 0;
		}

		return Math.abs(this.frequencyKHz - prev) > 0.001;
	}
}
