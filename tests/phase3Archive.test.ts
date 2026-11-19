import { describe, expect, it } from 'vitest';
import {
	getCatalogTracks,
	getPlaylistForDate,
	pickTrackForBroadcast,
	resolveArchiveMp3Url
} from '../src/lib/server/archive/great78';

describe('Phase 3 Great 78 Project catalog', () => {
	it('contains a rich catalog with verified mp3File paths, valid durations, and years <= 1927', () => {
		const all = getCatalogTracks(1927);
		expect(all.length).toBeGreaterThanOrEqual(50);

		const categories = new Set(all.map((t) => t.category));
		expect(categories.has('jazz')).toBe(true);
		expect(categories.has('blues')).toBe(true);
		expect(categories.has('ballroom')).toBe(true);
		expect(categories.has('classical')).toBe(true);
		expect(categories.has('comedy')).toBe(true);

		for (const t of all) {
			expect(t.identifier.length).toBeGreaterThan(5);
			expect(t.mp3File.toLowerCase()).toMatch(/\.mp3$/);
			expect(t.durationSec).toBeGreaterThanOrEqual(60);
			expect(t.durationSec).toBeLessThanOrEqual(360);
			expect(t.year).toBeLessThanOrEqual(1927);
		}
	});

	it('filters tracks strictly by year <= targetYear', () => {
		const tracks1926 = getCatalogTracks(1926);
		expect(tracks1926.length).toBeGreaterThanOrEqual(40);
		for (const t of tracks1926) {
			expect(t.year).toBeLessThanOrEqual(1926);
		}
	});

	it('deterministically picks a matching mood track and respects excludeIds', () => {
		const a = pickTrackForBroadcast(1926, ['jazz'], '1926-11-19');
		const b = pickTrackForBroadcast(1926, ['jazz'], '1926-11-19');
		expect(a.identifier).toBe(b.identifier);
		expect(a.year).toBeLessThanOrEqual(1926);

		const excluded = new Set([a.identifier]);
		const c = pickTrackForBroadcast(1926, ['jazz'], '1926-11-19', excluded);
		expect(c.identifier).not.toBe(a.identifier);
	});

	it('resolves catalog MP3 download URLs immediately and builds deterministic playlists', async () => {
		const playlist = getPlaylistForDate(1926, '1926-11-19');
		expect(playlist.length).toBeGreaterThanOrEqual(40);

		const url = await resolveArchiveMp3Url(playlist[0].identifier);
		expect(url).not.toBeNull();
		expect(url).toContain(`https://archive.org/download/${encodeURIComponent(playlist[0].identifier)}/`);
		expect(url).toMatch(/\.mp3$/i);
	});
});
