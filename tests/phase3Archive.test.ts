import { describe, expect, it } from 'vitest';
import { getCatalogTracks, pickTrackForBroadcast } from '../src/lib/server/archive/great78';

describe('Phase 3 Great 78 Project catalog', () => {
	it('filters tracks strictly by year <= targetYear', () => {
		const tracks1926 = getCatalogTracks(1926);
		expect(tracks1926.length).toBeGreaterThan(0);
		for (const t of tracks1926) {
			expect(t.year).toBeLessThanOrEqual(1926);
		}
	});

	it('deterministically picks a matching mood track for a broadcast date', () => {
		const a = pickTrackForBroadcast(1926, ['jazz'], '1926-11-15');
		const b = pickTrackForBroadcast(1926, ['jazz'], '1926-11-15');
		expect(a.identifier).toBe(b.identifier);
		expect(a.year).toBeLessThanOrEqual(1926);
	});
});
