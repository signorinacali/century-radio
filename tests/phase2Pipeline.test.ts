import { describe, expect, it } from 'vitest';
import { isValidIsoDate, normalizeStationId } from '../src/lib/server/broadcastService';
import { ingestHistoricalFacts, offsetIsoDate } from '../src/lib/server/history/ingest';
import { fetchPeriodContext } from '../src/lib/server/history/periodContext';
import { fetchVintageChronicles } from '../src/lib/server/history/vintageChronicles';
import { parseMonthChronicleWikitext } from '../src/lib/server/history/wikiChronicle';
import { extractMatchingItems } from '../src/lib/server/history/wikimedia';
import {
	buildDeterministicBroadcast,
	parseLlmBroadcastJson,
	requestDeepseekBroadcastJson,
	resolveProviderOrder
} from '../src/lib/server/llm/scriptGenerator';
import {
	getVoiceForSegment,
	parseDialogueTurns,
	splitScriptIntoChunks,
	stripId3Header,
	VOICE_APOLLO,
	VOICE_ASTERIA,
	VOICE_ATHENA,
	VOICE_ORION
} from '../src/lib/server/tts/deepgram';

describe('Phase 2 server helpers', () => {
	it('validates ISO dates and normalizes station IDs strictly', () => {
		expect(isValidIsoDate('1926-11-15')).toBe(true);
		expect(isValidIsoDate('1926-1-5')).toBe(false);
		expect(isValidIsoDate('invalid')).toBe(false);
		expect(normalizeStationId('wgn')).toBe('wgn');
		expect(normalizeStationId('wcrn')).toBe('wcrn');
		expect(normalizeStationId('other')).toBe('wcrn');
	});

	it('assigns specialized Deepgram voice personalities across all segment types', () => {
		expect(getVoiceForSegment('STATION_ID')).toBe(VOICE_APOLLO);
		expect(getVoiceForSegment('NEWS_BULLETIN')).toBe(VOICE_APOLLO);
		expect(getVoiceForSegment('FEATURE_STORY')).toBe(VOICE_APOLLO);
		expect(getVoiceForSegment('FIRESIDE_EDITORIAL')).toBe(VOICE_APOLLO);
		expect(getVoiceForSegment('OBITUARY_WIRE')).toBe(VOICE_APOLLO);
		expect(getVoiceForSegment('CONCERT_HALL')).toBe(VOICE_APOLLO);
		expect(getVoiceForSegment('VINTAGE_AD')).toBe(VOICE_ASTERIA);
		expect(getVoiceForSegment('WEATHER_REPORT')).toBe(VOICE_ATHENA);
		expect(getVoiceForSegment('SCIENCE_AND_AVIATION')).toBe(VOICE_ATHENA);
		expect(getVoiceForSegment('MARKET_REPORT')).toBe(VOICE_ORION);
		expect(getVoiceForSegment('SPORTS_ROUNDUP')).toBe(VOICE_ORION);
		expect(getVoiceForSegment('VARIETY_HOUR')).toBe(VOICE_ORION);
		expect(getVoiceForSegment('COMEDY_SKETCH')).toBe(VOICE_ORION);
	});

	it('parses multi-voice radio drama cues into distinct speaker turns without cue prefixes', () => {
		const dramaScript = [
			'ANNOUNCER: Welcome to the Century Mystery Playhouse.',
			'CLARA: Look at the telegraph ribbon trembling on the desk!',
			'INSPECTOR: Keep your voice low, Miss Vance.',
			'REPORTER: Forgive the intrusion, I just ran from the wire desk!'
		].join('\n\n');

		const turns = parseDialogueTurns(dramaScript, VOICE_APOLLO);
		expect(turns.length).toBe(4);
		expect(turns[0].voiceModel).toBe(VOICE_APOLLO);
		expect(turns[0].text).toBe('Welcome to the Century Mystery Playhouse.');
		expect(turns[1].voiceModel).toBe(VOICE_ASTERIA);
		expect(turns[1].text).not.toContain('CLARA:');
		expect(turns[2].voiceModel).toBe(VOICE_ORION);
		expect(turns[3].voiceModel).toBe(VOICE_ATHENA);
	});

	it('parses Wikipedia Month_Year wikitext into clean exact-day events, deaths, and press citations', () => {
		const sampleWikitext = `
==November 18, 1926 (Thursday)==
*Something happened yesterday.

==November 19, 1926 (Friday)==
*Nine people were killed in a railway accident in [[Yorkshire]] between [[Parkgate, South Yorkshire|Parkgate]] and [[Rawmarsh]].<ref>{{cite news |url = https://www.nytimes.com/1926/11/20/archives/british-rail-crash.html |title = British Rail Crash Kills 8 |date = November 20, 1926 |work = The New York Times }}</ref>
*The [[Paramount Theatre (New York City)|Paramount Theatre]] opened in New York City.<ref>{{cite news |url = https://www.nytimes.com/1926/11/20/archives/paramount.html |title = Brilliant Opening at New Paramount |newspaper = The New York Times |first = Mordaunt |last = Hall }}</ref>
*'''Born:'''
**[[Jeane Kirkpatrick]], U.S. Ambassador to the United Nations (d. 2006)
*'''Died:'''
**[[Clement Shorter]], 69, British journalist and editor of ''[[The Sphere (newspaper)|The Sphere]]''

==November 20, 1926 (Saturday)==
*Future item.
`;

		const parsed = parseMonthChronicleWikitext(sampleWikitext, 1926, 11, 19);
		const events = parsed.filter((f) => f.kind === 'event');
		const deaths = parsed.filter((f) => f.kind === 'death');
		const births = parsed.filter((f) => f.kind === 'birth');

		expect(events.length).toBe(2);
		expect(events[0].text).toContain('Nine people were killed in a railway accident in Yorkshire between Parkgate and Rawmarsh.');
		expect(events[0].text).not.toContain('[[');
		expect(events[0].text).not.toContain('<ref');
		expect(events[0].pressCitations?.[0]?.newspaper).toBe('The New York Times');
		expect(events[0].pressCitations?.[0]?.headline).toBe('British Rail Crash Kills 8');
		expect(events[1].relatedEntities).toContain('Paramount Theatre');
		expect(deaths.length).toBe(1);
		expect(deaths[0].text).toContain('Clement Shorter');
		expect(births.length).toBe(1);
	});

	it('fetches authentic vintage chronicles and period context without duplicating narrative text', async () => {
		const vintage = await fetchVintageChronicles('1926-11-15');
		expect(vintage.length).toBeGreaterThan(0);
		expect(vintage[0].source.provider).toBe('curated_archive');
		expect(vintage[0].year).toBe(1926);

		const period = await fetchPeriodContext('1926-11-15');
		expect(period.length).toBeGreaterThan(0);
		expect(period[0].detailedContext).toBeDefined();
		expect(period[0].text).not.toContain(period[0].detailedContext!.slice(0, 40));
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

	it('ingests rolling multi-day news desk facts for an exact 1926 date', async () => {
		const facts = await ingestHistoricalFacts('1926-11-19');
		expect(facts.length).toBeGreaterThanOrEqual(8);
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
			expect(/[.!?—]/.test(chunk.slice(-2))).toBe(true);
		}

		const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
		expect(totalLength).toBeGreaterThanOrEqual(longScript.length - 20);
	});

	it('strips ID3 headers from subsequent MP3 chunks correctly', () => {
		const id3Chunk = new Uint8Array(30);
		id3Chunk[0] = 0x49;
		id3Chunk[1] = 0x44;
		id3Chunk[2] = 0x33;
		id3Chunk[3] = 3;
		id3Chunk[9] = 10;
		id3Chunk[20] = 0xff;
		id3Chunk[21] = 0xfb;

		const stripped = stripId3Header(id3Chunk);
		expect(stripped.length).toBe(10);
		expect(stripped[0]).toBe(0xff);
		expect(stripped[1]).toBe(0xfb);

		const rawChunk = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
		expect(stripId3Header(rawChunk)).toEqual(rawChunk);
	});

	it('builds distinct 18-segment WCRN and WGN broadcasts with zero duplicate tracks or paragraphs', () => {
		const facts = [
			{
				kind: 'event' as const,
				year: 1926,
				date: '1926-07-19',
				text: 'The Paramount Theatre opened its summer stage in New York.',
				source: {
					provider: 'wikipedia' as const,
					title: 'Paramount Theatre — July 19, 1926',
					url: 'https://en.wikipedia.org/wiki/Paramount_Theatre_(New_York_City)',
					originalDate: '1926-07-19'
				},
				detailedContext:
					'Opened as a grand 3,664-seat movie palace and showcase theater on Times Square in Midtown Manhattan.',
				pressCitations: [
					{
						newspaper: 'The New York Times',
						headline: 'Brilliant Opening at New Paramount',
						date: 'July 20, 1926',
						url: 'https://www.nytimes.com/'
					}
				]
			},
			{
				kind: 'death' as const,
				year: 1926,
				date: '1926-07-19',
				text: 'Clement Shorter, 69, British journalist and editor of The Sphere.',
				source: {
					provider: 'wikipedia' as const,
					title: 'Clement Shorter — July 19, 1926',
					originalDate: '1926-07-19'
				},
				category: 'obituary'
			}
		];

		const wcrn = buildDeterministicBroadcast('1926-07-19', facts, 'wcrn');
		const wgn = buildDeterministicBroadcast('1926-07-19', facts, 'wgn');

		expect(wcrn.schemaVersion).toBe(3);
		expect(wcrn.segments.length).toBe(18);
		expect(wgn.segments.length).toBe(18);
		expect(wcrn.stationCallsign).toBe('WCRN-AM');
		expect(wgn.stationCallsign).toBe('WGN-MIDWEST');
		expect(wcrn.clippings.length).toBeGreaterThan(0);
		expect(wcrn.morseDispatch).toContain('1926-07-19');

		// Verify all required show types are present
		const types = wcrn.segments.map((s) => s.type);
		expect(types).toContain('STATION_ID');
		expect(types).toContain('NEWS_BULLETIN');
		expect(types).toContain('FEATURE_STORY');
		expect(types).toContain('MUSIC_INTERLUDE');
		expect(types).toContain('VARIETY_HOUR');
		expect(types).toContain('MARKET_REPORT');
		expect(types).toContain('SCIENCE_AND_AVIATION');
		expect(types).toContain('RADIO_DRAMA');
		expect(types).toContain('CONCERT_HALL');
		expect(types).toContain('SPORTS_ROUNDUP');
		expect(types).toContain('OBITUARY_WIRE');
		expect(types).toContain('VINTAGE_AD');
		expect(types).toContain('WEATHER_REPORT');
		expect(types).toContain('FIRESIDE_EDITORIAL');

		// Verify zero duplicate Archive.org track IDs within a broadcast day
		const archiveIds = wcrn.segments
			.map((s) => s.audio.archiveId)
			.filter((id): id is string => Boolean(id));
		expect(archiveIds.length).toBe(5);
		expect(new Set(archiveIds).size).toBe(archiveIds.length);

		// Verify zero duplicate paragraphs within each spoken segment
		for (const seg of wcrn.segments) {
			const paras = seg.scriptText.split(/\n\s*\n/).map((p) => p.trim());
			expect(new Set(paras).size).toBe(paras.length);
		}

		// Verify seasonal summer weather (not autumn!) and distinct NYC vs Chicago identity
		const wcrnWx = wcrn.segments.find((s) => s.type === 'WEATHER_REPORT')!;
		const wgnWx = wgn.segments.find((s) => s.type === 'WEATHER_REPORT')!;
		expect(wcrnWx.scriptText.toLowerCase()).toContain('summer');
		expect(wcrnWx.scriptText).toContain('Whitehall Building');
		expect(wgnWx.scriptText).toContain('Chicago Weather Bureau');

		// Distinct market desks
		const wcrnMkt = wcrn.segments.find((s) => s.type === 'MARKET_REPORT')!;
		const wgnMkt = wgn.segments.find((s) => s.type === 'MARKET_REPORT')!;
		expect(wcrnMkt.scriptText).toContain('New York Stock Exchange');
		expect(wgnMkt.scriptText).toContain('Chicago Board of Trade');
		expect(wcrn.generatedBy).toBe('deterministic');
	});

	it('prioritizes DeepSeek by default and flips order when Gemini is configured as primary', () => {
		expect(resolveProviderOrder()).toEqual(['deepseek', 'gemini']);
		expect(resolveProviderOrder('deepseek')).toEqual(['deepseek', 'gemini']);
		expect(resolveProviderOrder('gemini')).toEqual(['gemini', 'deepseek']);
		expect(resolveProviderOrder('GEMINI')).toEqual(['gemini', 'deepseek']);
	});

	it('parses fenced or raw LLM broadcast JSON and normalizes unknown segment types', () => {
		const validSegments = Array.from({ length: 12 }, (_, idx) => ({
			type:
				idx === 0
					? 'STATION_ID'
					: idx === 10
						? 'obituary'
						: idx === 11
							? 'UNKNOWN_CUSTOM_TYPE'
							: 'NEWS_BULLETIN',
			title: `Segment ${idx + 1}`,
			scriptText: `Multi-paragraph radio prose for segment ${idx + 1}.\n\nSecond paragraph context.`,
			durationSec: 65,
			moodTags: ['urgent'],
			topicTags: ['politics']
		}));

		const fenced = '```json\n' + JSON.stringify({ segments: validSegments }) + '\n```';
		const parsed = parseLlmBroadcastJson(fenced);
		expect(parsed).not.toBeNull();
		expect(parsed!.length).toBe(12);
		expect(parsed![0].type).toBe('STATION_ID');
		expect(parsed![10].type).toBe('OBITUARY_WIRE');
		expect(parsed![11].type).toBe('NEWS_BULLETIN');

		// Rejects payloads with fewer than 10 segments
		expect(parseLlmBroadcastJson(JSON.stringify({ segments: validSegments.slice(0, 5) }))).toBeNull();
	});

	it('calls DeepSeek chat completions with deepseek-flash and json_object response_format', async () => {
		let capturedUrl = '';
		let capturedInit: RequestInit | undefined;

		const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			capturedUrl = String(input);
			capturedInit = init;
			return new Response(
				JSON.stringify({
					choices: [{ message: { content: JSON.stringify({ segments: [] }) } }]
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}) as typeof fetch;

		const result = await requestDeepseekBroadcastJson(
			'System JSON instruction',
			'User prompt',
			'ds-test-key',
			'deepseek-flash',
			mockFetch
		);

		expect(capturedUrl).toBe('https://api.deepseek.com/v1/chat/completions');
		const headers = capturedInit?.headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer ds-test-key');

		const body = JSON.parse(String(capturedInit?.body));
		expect(body.model).toBe('deepseek-flash');
		expect(body.thinking).toEqual({ type: 'disabled' });
		expect(body.response_format).toEqual({ type: 'json_object' });
		expect(JSON.parse(result)).toEqual({ segments: [] });
	});
});
