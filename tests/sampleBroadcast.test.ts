import { describe, expect, it } from 'vitest';
import { computeCenturyDate, createSampleBroadcastDay } from '../src/lib/data/sampleBroadcast';

describe('sampleBroadcast', () => {
	it('computes exact date 100 years prior with day offsets', () => {
		const base = new Date('2026-11-15T12:00:00Z');
		expect(computeCenturyDate(0, 100, base)).toBe('1926-11-15');
		expect(computeCenturyDate(-1, 100, base)).toBe('1926-11-14');
		expect(computeCenturyDate(1, 100, base)).toBe('1926-11-16');
	});

	it('builds a valid v3 BroadcastDay with ordered segments, clippings, and morse dispatch', () => {
		const day = createSampleBroadcastDay('1926-11-15', 'wcrn');
		expect(day.schemaVersion).toBe(3);
		expect(day.stationId).toBe('wcrn');
		expect(day.wavelengthMeters).toBe(422.3);
		expect(day.morseDispatch.length).toBeGreaterThan(20);
		expect(day.clippings.length).toBeGreaterThanOrEqual(2);
		expect(day.segments.length).toBeGreaterThanOrEqual(10);
		expect(day.segments[0].type).toBe('STATION_ID');
		for (let i = 1; i < day.segments.length; i++) {
			expect(day.segments[i].order).toBeGreaterThan(day.segments[i - 1].order);
		}
	});

	it('supports distinct WGN Chicago fallback identity', () => {
		const day = createSampleBroadcastDay('1926-11-15', 'wgn');
		expect(day.stationId).toBe('wgn');
		expect(day.stationCallsign).toBe('WGN-MIDWEST');
		expect(day.targetFrequencyKHz).toBe(870);
		expect(day.stationLocation).toBe('Chicago, IL');
	});
});
