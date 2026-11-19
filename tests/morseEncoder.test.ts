import { describe, expect, it } from 'vitest';
import { encodeMorseSymbols, getMorseCodeForChar } from '../src/lib/audio/morseEncoder';

describe('morseEncoder', () => {
	it('encodes standard ITU letters and digits accurately', () => {
		expect(getMorseCodeForChar('c')).toBe('-.-.');
		expect(getMorseCodeForChar('q')).toBe('--.-');
		expect(getMorseCodeForChar('7')).toBe('--...');
		expect(getMorseCodeForChar('1')).toBe('.----');
	});

	it('emits timing events and decoded characters in exact order', () => {
		const events = encodeMorseSymbols('CQ 1926');
		const emitted = events
			.map((e) => e.emitChar)
			.filter((ch): ch is string => Boolean(ch))
			.join('')
			.trim();

		expect(emitted).toBe('CQ 1926');
		const toneEvents = events.filter((e) => e.on);
		expect(toneEvents.length).toBeGreaterThan(15);
		for (const ev of toneEvents) {
			expect([1, 3]).toContain(ev.units);
		}
	});

	it('returns empty list for blank input', () => {
		expect(encodeMorseSymbols('   ')).toEqual([]);
	});
});
