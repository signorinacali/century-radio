import type { AudioPlaybackState } from '$lib/state/radioStore.svelte';
import type { PowerState } from '$lib/state/radioStore.svelte';

export function formatClockSec(totalSec: number): string {
	const safe = Math.max(0, Math.floor(totalSec));
	const mins = Math.floor(safe / 60);
	const secs = safe % 60;
	return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatAudioStatusLabel(power: PowerState, audioState: AudioPlaybackState): string {
	if (power === 'OFF') return 'STANDBY';
	if (power === 'WARMING_UP') return 'TUBES WARMING';
	switch (audioState) {
		case 'buffering':
			return 'BUFFERING WIRE…';
		case 'playing_intro':
			return 'ON AIR • HOST INTRO';
		case 'playing_voice':
			return 'ON AIR • VOICE';
		case 'playing_78rpm':
			return '78RPM TURNTABLE';
		case 'fallback':
			return 'TRANSCRIPT / SPEECH';
		default:
			return 'CARRIER LOCKED';
	}
}

export const LANDMARK_DATES = [
	{ iso: '1926-11-15', label: 'Nov 15, 1926 • NBC Debut' },
	{ iso: '1926-11-19', label: 'Nov 19, 1926 • Paramount & Rail' },
	{ iso: '1926-09-23', label: 'Sep 23, 1926 • Tunney vs Dempsey' },
	{ iso: '1927-05-21', label: 'May 21, 1927 • Lindbergh Paris' }
];
