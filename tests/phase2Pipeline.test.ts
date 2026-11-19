import { describe, expect, it } from 'vitest';
import {
	chunkTextForTts,
	getVoiceForSegment,
	splitScriptIntoChunks,
	stripId3Header
} from '../src/lib/server/tts/deepgram';
import { isValidIsoDate } from '../src/lib/server/broadcastService';
import { ingestHistoricalFacts, offsetIsoDate } from '../src/lib/server/history/ingest';
import { fetchPeriodContext } from '../src/lib/server/history/periodContext';
import { fetchVintageChronicles } from '../src/lib/server/history/vintageChronicles';
import { extractMatchingItems } from '../src/lib/server/history/wikimedia';
import { buildDeterministicBroadcast } from '../src/lib/server/llm/scriptGenerator';

describe('Phase 2 server helpers', () => {
	it('validates ISO dates strictly', () => {
		expect(isValidIsoDate('1926-11-15')).toBe(true);
		expect(isValidIsoDate('1926-1-5')).toBe(false);
		expect(isValidIsoDate('invalid')).toBe(false);
	});

	it('assigns specialized Deepgram voice personalities by segment type', () => {
		expect(getVoiceForSegment('STATION_ID')).toBe('aura-2-apollo-en');
		expect(getVoiceForSegment('NEWS_BULLETIN')).toBe('aura-2-apollo-en');
		expect(getVoiceForSegment('FEATURE_STORY')).toBe('aura-2-apollo-en');
		expect(getVoiceForSegment('FIRESIDE_EDITORIAL')).toBe('aura-2-apollo-en');
		expect(getVoiceForSegment('VINTAGE_AD')).toBe('aura-2-asteria-en');
		expect(getVoiceForSegment('WEATHER_REPORT')).toBe('aura-2-athena-en');
		expect(getVoiceForSegment('SCIENCE_AND_AVIATION')).toBe('aura-2-athena-en');
		expect(getVoiceForSegment('MARKET_REPORT')).toBe('aura-2-orion-en');
		expect(getVoiceForSegment('SPORTS_ROUNDUP')).toBe('aura-2-orion-en');
	});

	it('fetches authentic vintage chronicles and period context', async () => {
		const vintage = await fetchVintageChronicles('1926-11-15');
		expect(vintage.length).toBeGreaterThan(0);
		expect(vintage[0].source.provider).toBe('curated_archive');
		expect(vintage[0].year).toBe(1926);

		const period = await fetchPeriodContext('1926-11-15');
		expect(period.length).toBeGreaterThan(0);
		expect(period[0].detailedContext).toBeDefined();
		expect(period[0].relatedEntities?.length).toBeGreaterThan(0);
	});

	it('computes rolling date offsets accurately', () => {
		expect(offsetIsoDate('1926-11-15', -1)).toBe('1926-11-14');
		expect(offsetIsoDate('1926-11-15', -2)).toBe('1926-11-13');
		expect(offsetIsoDate('1926-03-01', -1)).toBe('1926-02-28');
	});

	it('extracts rich context, categories, and related entities from Wikimedia feed', () => {
		const mockFeed = {
			events: [
				{
					year: 1926,
					text: 'The National Broadcasting Company begins radio broadcasting.',
					pages: [
						{
							title: 'NBC',
							description: 'American radio network',
							extract:
								'The National Broadcasting Company is an American commercial broadcast radio and television network.',
							content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/NBC' } }
						}
					]
				}
			]
		};

		const extracted = extractMatchingItems(mockFeed, 1926, '1926-11-15');
		expect(extracted.length).toBe(1);
		expect(extracted[0].detailedContext).toContain('American commercial broadcast radio');
		expect(extracted[0].relatedEntities).toContain('NBC');
		expect(extracted[0].source.url).toBe('https://en.wikipedia.org/wiki/NBC');
	});

	it('ingests rolling multi-day news desk facts', async () => {
		const facts = await ingestHistoricalFacts('1926-11-15');
		expect(facts.length).toBeGreaterThanOrEqual(6);
		// Check that facts have sources and detailedContext
		const hasContext = facts.some((f) => f.detailedContext && f.detailedContext.length > 20);
		expect(hasContext).toBe(true);
	}, 15000);

	it('splits long scripts >3,000 chars strictly on sentence boundaries without truncation', () => {
		const paragraph1 = Array.from(
			{ length: 20 },
			(_, i) => `Paragraph one sentence ${i + 1} detailing international news dispatches and treaties.`
		).join(' ');

		const paragraph2 = Array.from(
			{ length: 20 },
			(_, i) => `Paragraph two sentence ${i + 1} explaining domestic commerce and transcontinental trade.`
		).join(' ');

		const paragraph3 = Array.from(
			{ length: 20 },
			(_, i) => `Paragraph three sentence ${i + 1} analyzing financial market movements and commodities.`
		).join(' ');

		const longScript = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
		expect(longScript.length).toBeGreaterThan(3000);

		const chunks = splitScriptIntoChunks(longScript, 1000);
		expect(chunks.length).toBeGreaterThan(3);

		for (const chunk of chunks) {
			expect(chunk.length).toBeLessThanOrEqual(1000);
			// Chunk should end on a sentence boundary or clause
			expect(/[.!?—]/.test(chunk.slice(-2))).toBe(true);
		}

		// Reassembled text contains all sentences
		const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
		expect(totalLength).toBeGreaterThanOrEqual(longScript.length - 20);
	});

	it('strips ID3 headers from subsequent MP3 chunks correctly', () => {
		// Mock ID3v2 header: 'ID3', ver 3.0, flags 0, syncsafe size 10 -> total header length 20
		const id3Chunk = new Uint8Array(30);
		id3Chunk[0] = 0x49; // 'I'
		id3Chunk[1] = 0x44; // 'D'
		id3Chunk[2] = 0x33; // '3'
		id3Chunk[3] = 3;
		id3Chunk[4] = 0;
		id3Chunk[5] = 0;
		id3Chunk[6] = 0;
		id3Chunk[7] = 0;
		id3Chunk[8] = 0;
		id3Chunk[9] = 10; // syncsafe size 10 -> header = 10 + 10 = 20
		id3Chunk[20] = 0xff; // first byte of mp3 audio frame sync
		id3Chunk[21] = 0xfb;

		const stripped = stripId3Header(id3Chunk);
		expect(stripped.length).toBe(10);
		expect(stripped[0]).toBe(0xff);
		expect(stripped[1]).toBe(0xfb);

		// Non-ID3 buffer is untouched
		const rawChunk = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
		expect(stripId3Header(rawChunk)).toEqual(rawChunk);
	});

	it('builds a rich 12-segment broadcast block in deterministic fallback mode', () => {
		const facts = [
			{
				kind: 'event' as const,
				year: 1926,
				date: '1926-11-15',
				text: 'NBC inaugurates nationwide network.',
				source: {
					provider: 'curated_archive' as const,
					title: 'NBC Inaugural',
					originalDate: '1926-11-15'
				},
				detailedContext: 'Twenty-four stations linked coast-to-coast.'
			}
		];

		const day = buildDeterministicBroadcast('1926-11-15', facts);
		expect(day.schemaVersion).toBe(2);
		expect(day.segments.length).toBe(12);

		const segmentTypes = day.segments.map((s) => s.type);
		expect(segmentTypes).toContain('STATION_ID');
		expect(segmentTypes).toContain('NEWS_BULLETIN');
		expect(segmentTypes).toContain('FEATURE_STORY');
		expect(segmentTypes).toContain('MUSIC_INTERLUDE');
		expect(segmentTypes).toContain('MARKET_REPORT');
		expect(segmentTypes).toContain('SCIENCE_AND_AVIATION');
		expect(segmentTypes).toContain('SPORTS_ROUNDUP');
		expect(segmentTypes).toContain('VINTAGE_AD');
		expect(segmentTypes).toContain('WEATHER_REPORT');
		expect(segmentTypes).toContain('FIRESIDE_EDITORIAL');

		// Verify multi-paragraph depth for news segments
		const leadNews = day.segments.find((s) => s.type === 'NEWS_BULLETIN');
		expect(leadNews?.scriptText).toContain('\n\n');
		expect(leadNews?.scriptText.length).toBeGreaterThan(200);
	});
});
