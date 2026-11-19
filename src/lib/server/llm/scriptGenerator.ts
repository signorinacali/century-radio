import { env } from '$env/dynamic/private';
import { GoogleGenAI, Type } from '@google/genai';
import { formatCenturyDateLong } from '$lib/data/sampleBroadcast';
import { pickTrackForBroadcast } from '$lib/server/archive/great78';
import type { IngestedFact } from '$lib/server/history/wikimedia';
import { getVoiceForSegment } from '$lib/server/tts/deepgram';
import type { BroadcastDay, BroadcastSegment, MoodTag, SegmentType, TopicTag } from '$lib/types/broadcast';

interface GeneratedSegmentPayload {
	type: SegmentType;
	title: string;
	scriptText: string;
	durationSec: number;
	moodTags: MoodTag[];
	topicTags: TopicTag[];
}

export function buildDeterministicBroadcast(isoDate: string, facts: IngestedFact[]): BroadcastDay {
	const longDate = formatCenturyDateLong(isoDate);
	const targetYear = Number(isoDate.slice(0, 4)) || 1926;

	// Categorize facts
	const eventFacts = facts.filter((f) => f.kind === 'event' || f.kind === 'newspaper');
	const leadFact = eventFacts[0] ?? facts[0];
	const secondaryFact = eventFacts[1] ?? facts[1] ?? leadFact;
	const developingFact =
		facts.find((f) => f.category === 'developing_wire') ?? eventFacts[2] ?? leadFact;
	const cultureFact =
		facts.find((f) => f.category === 'culture' || f.category === 'sports') ??
		eventFacts[3] ??
		secondaryFact;

	const segments: BroadcastSegment[] = [];
	let offset = 0;

	const pushSeg = (
		id: string,
		type: SegmentType,
		title: string,
		scriptText: string,
		moodTags: MoodTag[],
		topicTags: TopicTag[],
		sources: BroadcastSegment['sources']
	) => {
		const isMusic = type === 'MUSIC_INTERLUDE';
		const track = isMusic ? pickTrackForBroadcast(targetYear, moodTags, `${isoDate}-${id}`) : null;
		const resolvedTitle = track ? `${track.title} — ${track.creator} (${track.year})` : title;
		const resolvedSources = track
			? [
					{
						provider: 'curated_archive' as const,
						title: `Internet Archive Great 78 Project: ${track.title} (${track.year})`,
						url: `https://archive.org/details/${track.identifier}`,
						originalDate: String(track.year)
					}
				]
			: sources;

		// Calculate realistic spoken duration (~145 words per minute, or 0.41 sec/word)
		const wordCount = scriptText.trim().split(/\s+/).length;
		const durationSec = isMusic ? 180 : Math.max(22, Math.min(240, Math.round(wordCount * 0.41)));

		segments.push({
			id,
			order: segments.length + 1,
			type,
			title: resolvedTitle,
			scheduledOffsetSec: offset,
			durationSec,
			moodTags,
			topicTags,
			scriptText,
			audio: track
				? {
						sourceType: 'internet_archive',
						url: `/api/archive-audio?id=${encodeURIComponent(track.identifier)}`,
						format: 'audio/mpeg',
						durationSec,
						archiveId: track.identifier
					}
				: {
						sourceType: 'tts_blob',
						url: `/api/tts?date=${encodeURIComponent(isoDate)}&segment=${encodeURIComponent(id)}`,
						format: 'audio/mpeg',
						durationSec,
						voiceModel: getVoiceForSegment(type)
					},
			sources: resolvedSources
		});
		offset += durationSec;
	};

	// 1. Station ID & Evening Schedule
	pushSeg(
		'seg-01-id',
		'STATION_ID',
		'WCRN Evening Sign-On & Program Rundown',
		`Good evening, ladies and gentlemen. This is station WCRN, operating by authority of the Federal Department of Commerce on a clear-channel frequency of 710 kilocycles, corresponding to a wavelength of 422.3 meters in the American broadcast band.\n\nFrom our studios atop the Manhattan skyline, we welcome listeners across the Atlantic Seaboard and inland states to our comprehensive evening broadcast for ${longDate}.\n\nStand by for our lead international and national wire bulletins, followed by a special correspondent inquiry into the day’s developments, authentic recordings from the studio Victrola, our Wall Street and Curb ticker report, aeronautical dispatches, and our regional maritime weather summary.`,
		['fireside'],
		['culture'],
		[
			{
				provider: 'curated_archive',
				title: 'Department of Commerce 710 kHz Wavelength Assignment',
				originalDate: isoDate
			}
		]
	);

	// 2. Lead National & International Bulletin (Multi-Paragraph)
	const leadContext = leadFact?.detailedContext
		? `\n\nDetailed reports from our telegraph correspondents indicate that ${leadFact.detailedContext}`
		: '';
	pushSeg(
		'seg-02-lead-news',
		'NEWS_BULLETIN',
		leadFact?.source?.title ?? 'Lead National Wire Bulletin',
		`Flash from the Associated Press wire desk in New York — ${leadFact ? leadFact.text : 'A major diplomatic and commercial conference has assembled this evening to chart international policy.'}${leadContext}\n\nGovernment authorities and commercial leaders in Washington and foreign capitals have expressed keen interest in the outcome. Observers note that the implications of this dispatch are likely to be felt across the industrial and political centers throughout the coming months.`,
		['urgent'],
		['politics', 'commerce'],
		leadFact ? [leadFact.source] : []
	);

	// 3. Feature Story / Special Correspondent Report
	pushSeg(
		'seg-03-feature',
		'FEATURE_STORY',
		'Special Correspondent Report: The Pulse of the Nation',
		`Turning now to our special correspondent inquiry — Let us examine the human drama and historical significance unfolding behind the evening headlines.\n\nAcross the nation, the swift pace of modernization is reshaping both urban avenues and rural townships. From the soaring steel spires of Manhattan and Chicago to the sprawling agricultural valleys of the Midwest, wireless telegraphy and motor transport are shrinking distance and linking communities that were once days apart.\n\nEyewitness dispatches reaching our desk emphasize that the American public is embracing this era of unprecedented technical ingenuity with both wonder and cautious resolve. The transition to mechanized commerce and high-speed electrical communication continues to define this remarkable decade.`,
		['fireside', 'solemn'],
		['culture', 'politics'],
		[
			{
				provider: 'curated_archive',
				title: 'Associated Press Special Feature Wire',
				originalDate: isoDate
			}
		]
	);

	// 4. Music Interlude 1
	pushSeg(
		'seg-04-music',
		'MUSIC_INTERLUDE',
		'78rpm Ballroom Interlude',
		'[Studio Victrola Interlude] We pause now for a musical selection spinning on the studio phonograph — an authentic pre-1927 arrangement from the grand ballrooms of New York.',
		['jazz', 'upbeat'],
		['culture'],
		[]
	);

	// 5. Market Report & Financial Ticker
	pushSeg(
		'seg-05-market',
		'MARKET_REPORT',
		'Wall Street & Curb Exchange Closing Ticker',
		'The ticker tape has ceased its chatter on the floor of the New York Stock Exchange, and we bring you the official closing financial summary for the day.\n\nCall money held steady throughout the final trading hour at four and one-half percent, with demand moderate from commercial banks. Industrial shares experienced active accumulation, led by United States Steel, General Electric, and the Radio Corporation of America, which gained two and three-eighths points amidst heavy floor participation.\n\nIn the commodities pit at Chicago, December wheat eased slightly by three-quarters of a cent, closing at one dollar and thirty-eight cents a bushel, while cotton futures in New York displayed renewed strength on export inquiry from Liverpool.',
		['upbeat'],
		['commerce'],
		[
			{
				provider: 'curated_archive',
				title: 'New York Financial Chronicle & Ticker Tape (1920s)',
				originalDate: isoDate
			}
		]
	);

	// 6. Secondary News Bulletin (Developing Wire)
	const devContext = developingFact?.detailedContext ? `\n\n${developingFact.detailedContext}` : '';
	pushSeg(
		'seg-06-news-wire',
		'NEWS_BULLETIN',
		secondaryFact?.source?.title ?? 'Telegraph Wire & Developing Dispatches',
		`Continuing our coverage of developing stories reaching our wire desk — ${secondaryFact ? secondaryFact.text : 'Telegraph reports continue to arrive from regional bureaus.'}\n\nOur correspondents in regional bureaus report that public interest remains high as civic and state officials coordinate responses.${devContext}`,
		['urgent'],
		['politics', 'culture'],
		secondaryFact ? [secondaryFact.source] : []
	);

	// 7. Science, Aviation & Modern Marvels
	pushSeg(
		'seg-07-science',
		'SCIENCE_AND_AVIATION',
		'Modern Marvels: Aeronautics and Electrical Science',
		'From our desk of scientific and mechanical progress — The rapid expansion of commercial airway corridors under the Department of Commerce is heralding a new epoch in transcontinental transport.\n\nAirmail couriers operating night routes across the Allegheny mountains and western plains report that the newly installed revolving incandescent searchlights and radio beacons are dramatically reducing flying hazards. Pilots can now maintain scheduled delivery of postal pouches between New York and San Francisco in under thirty hours.\n\nMeanwhile, electrical laboratories in New Jersey and Massachusetts report significant breakthroughs in high-vacuum electron tubes and short-wave wireless transmitters, promising to bring clear-channel broadcast reception to the most isolated homesteads in the republic.',
		['upbeat'],
		['aviation', 'commerce'],
		[
			{
				provider: 'curated_archive',
				title: 'Scientific American & Aeronautics Digest (1926)',
				originalDate: isoDate
			}
		]
	);

	// 8. Sports & Cultural Wire
	const sportsFact = cultureFact?.text
		? `\n\nIn related cultural developments: ${cultureFact.text}`
		: '';
	pushSeg(
		'seg-08-sports',
		'SPORTS_ROUNDUP',
		'Sports Arena & Broadway Cultural Wire',
		`Turning now to the sporting arena and the theatrical lights of Broadway — Enthusiasm across the sporting world remains at fever pitch this season.\n\nFrom the baseball diamonds to the college football stadiums of the Big Ten and Eastern leagues, record-breaking crowds are filling grandstands to witness unprecedented athletic rivalry. Promoters report that gate receipts are shattering all previous standards as spectators flock to see legendary champions defend their laurels.${sportsFact}\n\nAlong Broadway, theater marquees are ablaze with new musical comedies and dramatic revues. Ticket agencies report standing room only for the leading revues, while silent picture palaces are drawing thousands daily to hear mighty Wurlitzer pipe organs accompany the silver screen.`,
		['upbeat', 'jazz'],
		['sports', 'culture'],
		cultureFact ? [cultureFact.source] : []
	);

	// 9. Music Interlude 2
	pushSeg(
		'seg-09-music',
		'MUSIC_INTERLUDE',
		'Late Evening 78rpm Syncopation',
		'[Studio Victrola Interlude] The turntable spins once more for our late evening listeners — a spirited syncopated foxtrot direct from the Victor talking machine library.',
		['upbeat', 'fireside'],
		['culture'],
		[]
	);

	// 10. Vintage Sponsor Advertisement
	pushSeg(
		'seg-10-ad',
		'VINTAGE_AD',
		'Sponsor Announcement: RCA Radiola 20 Super-Heterodyne',
		'A special message from our esteemed sponsor — Bring the living artists and symphony halls of the world directly into your parlor with the new five-tube RCA Radiola 20.\n\nCrafted in solid two-tone mahogany cabinetwork, the Radiola 20 offers unmatched single-dial vernier tuning, allowing you to separate distant carriers without whistle or distortion. Hear the violin whisper and the orator’s voice as clearly as though you sat in the front row of the auditorium.\n\nPriced at only one hundred fifteen dollars, complete with Radiotron vacuum tubes. Easy payment terms may be arranged through your local authorized Victor or RCA merchant. Step into your neighborhood dealer tomorrow morning and ask for a demonstration!',
		['fireside'],
		['commerce'],
		[
			{
				provider: 'curated_archive',
				title: '1926 Radiola Display Copy & Catalog Price List',
				originalDate: isoDate.slice(0, 4)
			}
		]
	);

	// 11. Weather Bureau Forecast
	pushSeg(
		'seg-11-weather',
		'WEATHER_REPORT',
		'U.S. Weather Bureau Regional & Maritime Dispatch',
		'We turn now to the official regional and coastal dispatch prepared by the United States Weather Bureau for New York, New Jersey, and the Atlantic shipping lanes.\n\nA barometric high centered over the Ohio Valley is pressing eastward, bringing clear skies and crisp autumn temperatures. Tonight in the metropolitan area: Fair and colder, with fresh northwest breezes diminishing after midnight; the mercury is expected to descend to thirty-two degrees in suburban districts.\n\nFor shipping interests along the Atlantic Seaboard from Cape Cod to Cape Hatteras: Moderate northwesterly winds, sea moderate to smooth, visibility eight miles. Fair weather is anticipated for coastwise steamers tomorrow, with rising temperatures towards dusk.',
		['solemn'],
		['weather'],
		[
			{
				provider: 'curated_archive',
				title: 'U.S. Weather Bureau Daily Weather Map & Bulletin',
				originalDate: isoDate
			}
		]
	);

	// 12. Fireside Editorial & Sign-Off
	pushSeg(
		'seg-12-editorial',
		'FIRESIDE_EDITORIAL',
		'Evening Sign-Off: Reflections on the Modern Century',
		`As the hour grows late and the glowing vacuum tubes warm our parlors, we pause to reflect upon the remarkable epoch through which our nation is traveling on this ${longDate}.\n\nNever before in human history have millions of citizens shared the same spoken words, the same symphonies, and the same urgent wire dispatches across thousands of miles of countryside. The ether has become our common hearth, binding city and village into one great listening commonwealth.\n\nOn behalf of the engineers, announcers, and staff of station WCRN, we bid you a very peaceful and restful night. Until tomorrow evening at this same hour on 710 kilocycles, this is your announcer signing off. Good night, and pleasant dreams.`,
		['fireside', 'solemn'],
		['culture'],
		[
			{
				provider: 'curated_archive',
				title: 'WCRN Historical Sign-off Archive',
				originalDate: isoDate
			}
		]
	);

	return {
		schemaVersion: 2,
		id: isoDate,
		stationCallsign: 'WCRN-AM',
		stationLocation: 'New York, NY',
		targetFrequencyKHz: 710,
		totalDurationSec: offset,
		segments,
		generatedAt: new Date().toISOString()
	};
}

export async function generateBroadcastDay(
	isoDate: string,
	facts: IngestedFact[]
): Promise<BroadcastDay> {
	const apiKey = env.GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) {
		return buildDeterministicBroadcast(isoDate, facts);
	}

	try {
		const ai = new GoogleGenAI({ apiKey });
		const longDate = formatCenturyDateLong(isoDate);
		const targetYear = Number(isoDate.slice(0, 4)) || 1926;

		const factsSummary = facts
			.map((f, idx) => {
				const entities = f.relatedEntities?.length ? ` (Entities: ${f.relatedEntities.join(', ')})` : '';
				const context = f.detailedContext ? `\n   Background context: ${f.detailedContext}` : '';
				return `${idx + 1}. [${f.category ?? f.kind} | ${f.date}] ${f.text}${entities}${context}`;
			})
			.join('\n\n');

		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: `You are the chief continuity writer and news director for American AM radio station WCRN-AM (710 kHz, 422.3 meters, New York City).
Today is ${longDate} (${isoDate}). You are broadcasting LIVE in the year ${targetYear}.

CRITICAL MANDATE - LONG-FORM JOURNALISM:
You are STRICTLY FORBIDDEN from generating brief 1-or-2-sentence summaries or headline snippets.
Every spoken journalism segment (NEWS_BULLETIN, FEATURE_STORY, MARKET_REPORT, SCIENCE_AND_AVIATION, SPORTS_ROUNDUP, FIRESIDE_EDITORIAL, WEATHER_REPORT) must be rich, in-depth, multi-paragraph radio prose (3 to 5 full paragraphs, 180 to 350 words per major segment, separated by double newlines \\n\\n).

Transform the ingested historical facts below into a complete, varied 10-to-12 segment evening radio broadcast:
1. STATION_ID: Formal sign-on for WCRN New York (710 kHz / 422.3 meters), Manhattan studios, full evening program rundown preview.
2. NEWS_BULLETIN: Lead National & World Wire Bulletin. Deep-dive journalistic coverage of the top historical events (3-4 paragraphs, 200-350 words). Weave facts together with diplomatic/societal context.
3. FEATURE_STORY: An in-depth narrative story unpacking the "who, what, why, and human drama" behind a major event or expedition (3-4 paragraphs, 180-300 words).
4. MUSIC_INTERLUDE: Spoken studio announcer intro introducing a 1920s 78rpm foxtrot or jazz record spinning on the studio Victrola.
5. MARKET_REPORT: Wall Street closing ticker, Curb Exchange, call money rates, steel, automotive, and radio corporation stocks, Chicago grain/wheat futures (2-3 paragraphs, 140-220 words).
6. NEWS_BULLETIN: Secondary wire bulletin covering domestic and developing dispatches from the preceding days (2-3 paragraphs, 160-250 words).
7. SCIENCE_AND_AVIATION: Modern marvels: Airmail beacon routes, aeronautics, radio engineering, or medical breakthroughs (2-3 paragraphs, 140-220 words).
8. SPORTS_ROUNDUP: The sports desk and Broadway stage: boxing, baseball, college football, or theater openings (2-3 paragraphs, 140-220 words).
9. MUSIC_INTERLUDE: Second 78rpm ballroom syncopation or blues interlude with announcer introduction.
10. VINTAGE_AD: Authentic 1920s sponsor announcement (RCA Radiola, Victrola, Ford motorcars, or Gillette) with period pricing and persuasive copy (2 paragraphs, 100-160 words).
11. WEATHER_REPORT: Detailed regional meteorological dispatch, Atlantic coastal shipping gales, barometric pressure, and temperature extremes (2 paragraphs, 100-160 words).
12. FIRESIDE_EDITORIAL: Evening sign-off and reflective commentary on life and technical wonder in the twentieth century (2-3 paragraphs, 140-220 words).

RULES:
- PRESENT TENSE ONLY: You are living in ${targetYear}. Never say "100 years ago", "in ${targetYear}", or "historically". It is happening TODAY.
- CADENCE & STYLE: Mid-Atlantic 1920s radio prose, telegraph wire transitions ("Turning now to dispatches from Paris...", "Closer to home, our Associated Press wire reports...", "Let us examine the background of this remarkable affair...").
- FORMAT: Separate all paragraphs within scriptText with double newlines (\\n\\n).
- DURATION: Set durationSec realistically proportional to word count (~0.41 seconds per word; 60 to 180 seconds for spoken segments; 180 seconds for music interludes).

Historical Dispatches & Period Context:
${factsSummary}`,
			config: {
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.OBJECT,
					properties: {
						segments: {
							type: Type.ARRAY,
							items: {
								type: Type.OBJECT,
								properties: {
									type: {
										type: Type.STRING,
										enum: [
											'STATION_ID',
											'NEWS_BULLETIN',
											'FEATURE_STORY',
											'MUSIC_INTERLUDE',
											'MARKET_REPORT',
											'SCIENCE_AND_AVIATION',
											'SPORTS_ROUNDUP',
											'VINTAGE_AD',
											'WEATHER_REPORT',
											'FIRESIDE_EDITORIAL'
										]
									},
									title: { type: Type.STRING },
									scriptText: { type: Type.STRING },
									durationSec: { type: Type.INTEGER },
									moodTags: {
										type: Type.ARRAY,
										items: { type: Type.STRING }
									},
									topicTags: {
										type: Type.ARRAY,
										items: { type: Type.STRING }
									}
								},
								required: ['type', 'title', 'scriptText', 'durationSec', 'moodTags', 'topicTags']
							}
						}
					},
					required: ['segments']
				}
			}
		});

		const parsed = JSON.parse(response.text ?? '{}') as { segments?: GeneratedSegmentPayload[] };
		if (!parsed.segments || parsed.segments.length === 0) {
			return buildDeterministicBroadcast(isoDate, facts);
		}

		let offset = 0;
		const segments: BroadcastSegment[] = parsed.segments.map((seg, idx) => {
			const id = `seg-${String(idx + 1).padStart(2, '0')}-${seg.type.toLowerCase().replace(/_/g, '-')}`;
			const isMusic = seg.type === 'MUSIC_INTERLUDE';
			const moodTags = (seg.moodTags as MoodTag[]).slice(0, 2);
			const track = isMusic ? pickTrackForBroadcast(targetYear, moodTags, `${isoDate}-${id}`) : null;

			const wordCount = seg.scriptText.trim().split(/\s+/).length;
			const computedDuration = isMusic
				? 180
				: Math.max(22, Math.min(240, Math.round(wordCount * 0.41)));
			const durationSec = seg.durationSec > 15 ? seg.durationSec : computedDuration;

			const item: BroadcastSegment = {
				id,
				order: idx + 1,
				type: seg.type,
				title: track ? `${track.title} — ${track.creator} (${track.year})` : seg.title,
				scheduledOffsetSec: offset,
				durationSec,
				moodTags,
				topicTags: (seg.topicTags as TopicTag[]).slice(0, 2),
				scriptText: seg.scriptText,
				audio: track
					? {
							sourceType: 'internet_archive',
							url: `/api/archive-audio?id=${encodeURIComponent(track.identifier)}`,
							format: 'audio/mpeg',
							durationSec,
							archiveId: track.identifier
						}
					: {
							sourceType: 'tts_blob',
							url: `/api/tts?date=${encodeURIComponent(isoDate)}&segment=${encodeURIComponent(id)}`,
							format: 'audio/mpeg',
							durationSec,
							voiceModel: getVoiceForSegment(seg.type)
						},
				sources: track
					? [
							{
								provider: 'curated_archive',
								title: `Internet Archive Great 78 Project: ${track.title} (${track.year})`,
								url: `https://archive.org/details/${track.identifier}`,
								originalDate: String(track.year)
							}
						]
					: facts.slice(0, 2).map((f) => f.source)
			};
			offset += durationSec;
			return item;
		});

		return {
			schemaVersion: 2,
			id: isoDate,
			stationCallsign: 'WCRN-AM',
			stationLocation: 'New York, NY',
			targetFrequencyKHz: 710,
			totalDurationSec: offset,
			segments,
			generatedAt: new Date().toISOString()
		};
	} catch {
		return buildDeterministicBroadcast(isoDate, facts);
	}
}
