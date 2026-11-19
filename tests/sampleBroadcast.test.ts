import { describe, expect, it } from 'vitest';
import { computeCenturyDate, createSampleBroadcastDay } from '../src/lib/data/sampleBroadcast';

describe('sampleBroadcast', () => {
	it('computes exact date 100 years prior with day offsets', () => {
		const base = new Date('2026-11-15T12:00:00Z');
		expect(computeCenturyDate(0, 100, base)).toBe('1926-11-15');
		expect(computeCenturyDate(-1, 100, base)).toBe('1926-11-14');
		expect(computeCenturyDate(1, 100, base)).toBe('1926-11-16');
	});

	it('builds a valid BroadcastDay with ordered segments', () => {
		const day = createSampleBroadcastDay('1926-11-15');
		expect(day.schemaVersion).toBe(2);
		expect(day.segments.length).toBeGreaterThanOrEqual(10);
		expect(day.segments[0].type).toBe('STATION_ID');
		for (let i = 1; i < day.segments.length; i++) {
			expect(day.segments[i].order).toBeGreaterThan(day.segments[i - 1].order);
		}
	});
});
