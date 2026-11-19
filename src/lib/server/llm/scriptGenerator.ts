import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';
import { formatCenturyDateLong } from '$lib/data/sampleBroadcast';
import { pickTrackForBroadcast } from '$lib/server/archive/great78';
import type { IngestedFact } from '$lib/server/history/wikimedia';
import {
	buildMarketReport,
	buildSeasonalWeatherReport,
	getSeasonalSportsContext,
	pickRadioDrama,
	pickVintageAds
} from '$lib/server/llm/periodContentLibrary';
import { getSpeakerLabelForSegment, getVoiceForSegment } from '$lib/server/tts/deepgram';
import type {
	BroadcastDay,
	BroadcastSegment,
	HistoricalSource,
	MoodTag,
	NewspaperClipping,
	SegmentType,
	StationId,
	TopicTag,
	TrackCategory
} from '$lib/types/broadcast';

interface StationMeta {
	stationId: StationId;
	callsign: string;
	location: string;
	frequencyKHz: number;
	wavelengthMeters: number;
	studioDesc: string;
	concertHallName: string;
}

const STATION_META: Record<StationId, StationMeta> = {
	wcrn: {
		stationId: 'wcrn',
		callsign: 'WCRN-AM',
		location: 'New York, NY',
		frequencyKHz: 710,
		wavelengthMeters: 422.3,
		studioDesc: 'studios high above Fifth Avenue in Manhattan',
		concertHallName: 'Waldorf-Astoria Grand Ballroom Orchestra Hour'
	},
	wgn: {
		stationId: 'wgn',
		callsign: 'WGN-MIDWEST',
		location: 'Chicago, IL',
		frequencyKHz: 870,
		wavelengthMeters: 344.6,
		studioDesc: 'studios atop the Tribune Tower overlooking Michigan Avenue in Chicago',
		concertHallName: 'Drake Hotel Concert Ballroom Orchestra'
	}
};

interface GeneratedSegmentPayload {
	type: SegmentType;
	title: string;
	showName?: string;
	scriptText: string;
	introText?: string;
	durationSec: number;
	moodTags: MoodTag[];
	topicTags: TopicTag[];
	isMultiVoice?: boolean;
}

function estimateSpeechDuration(text: string, minSec = 24, maxSec = 260): number {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(minSec, Math.min(maxSec, Math.round(words * 0.42)));
}

function formatPressAttribution(fact: IngestedFact | undefined): string {
	const cit = fact?.pressCitations?.[0];
	if (!cit) return '';
	const byline = cit.author ? ` by correspondent ${cit.author}` : '';
	return ` As corroborated in dispatches printed by ${cit.newspaper}${byline}, "${cit.headline}."`;
}

function appendUniqueContext(baseText: string, context: string | undefined): string {
	if (!context) return baseText;
	const cleanBase = baseText.trim();
	const cleanCtx = context.trim();
	if (!cleanCtx || cleanBase.includes(cleanCtx.slice(0, 48))) {
		return cleanBase;
	}
	return `${cleanBase}\n\n${cleanCtx}`;
}

function buildNewspaperClippings(
	isoDate: string,
	facts: IngestedFact[],
	segments: BroadcastSegment[]
): NewspaperClipping[] {
	const clippings: NewspaperClipping[] = [];
	const seenHeadlines = new Set<string>();

	const pushClipping = (clip: NewspaperClipping) => {
		const key = clip.headline.toLowerCase().slice(0, 72);
		if (!key || seenHeadlines.has(key)) return;
		seenHeadlines.add(key);
		clippings.push(clip);
	};

	// 1. Contemporary press citations parsed from Wikipedia <ref>{{cite news}}</ref>
	for (const fact of facts) {
		for (const cit of fact.pressCitations ?? []) {
			pushClipping({
				id: `clip-press-${clippings.length + 1}`,
				masthead: cit.newspaper,
				headline: cit.headline,
				date: cit.date || isoDate,
				summary: fact.text,
				category: fact.category ?? fact.kind,
				url: cit.url ?? fact.source.url,
				provider: 'historical_press'
			});
		}
	}

	// 2. Exact-day historical wire dispatches
	for (const fact of facts.filter((f) => f.kind === 'event' || f.kind === 'death')) {
		pushClipping({
			id: `clip-wire-${clippings.length + 1}`,
			masthead: fact.source.newspaper || 'Associated Press Wire Archive',
			headline: fact.source.title,
			date: fact.date,
			summary: fact.detailedContext ? `${fact.text} — ${fact.detailedContext.slice(0, 240)}` : fact.text,
			category: fact.category ?? fact.kind,
			url: fact.source.url,
			provider: fact.source.provider
		});
	}

	// 3. Great 78 Project musical recordings aired on this broadcast
	for (const seg of segments) {
		if (seg.audio.sourceType === 'internet_archive' && seg.sources[0]) {
			pushClipping({
				id: `clip-78-${clippings.length + 1}`,
				masthead: 'Great 78rpm Discography',
				headline: seg.title,
				date: seg.sources[0].originalDate,
				summary: seg.introText ?? seg.scriptText,
				category: 'music',
				url: seg.sources[0].url,
				provider: 'internet_archive'
			});
		}
	}

	return clippings.slice(0, 14);
}

function buildMorseDispatch(
	isoDate: string,
	station: StationMeta,
	facts: IngestedFact[]
): string {
	const topHeadlines = facts
		.filter((f) => f.kind === 'event')
		.slice(0, 3)
		.map((f) => f.text.replace(/[^a-zA-Z0-9 .,'/-]/g, '').toUpperCase())
		.join(' = ');

	const fallbackWire = 'TRANSATLANTIC METEOROLOGICAL AND SHIPPING CHANNELS CLEAR';
	return `CQ CQ DE WCC WCC CHATHAM MASS WIRE RELAY ${isoDate} = TO ${station.callsign} ${station.location.toUpperCase()} = ${
		topHeadlines || fallbackWire
	} = AR K`;
}

function isArchiveMusicType(type: SegmentType): boolean {
	return (
		type === 'MUSIC_INTERLUDE' ||
		type === 'CONCERT_HALL' ||
		type === 'VARIETY_HOUR' ||
		type === 'COMEDY_SKETCH'
	);
}

function pickCategoryForSegment(type: SegmentType, segIndex: number): TrackCategory | undefined {
	if (type === 'COMEDY_SKETCH' || type === 'VARIETY_HOUR') return 'comedy';
	if (type === 'CONCERT_HALL') return 'classical';
	if (type === 'MUSIC_INTERLUDE') {
		const cycle: TrackCategory[] = ['jazz', 'ballroom', 'blues'];
		return cycle[segIndex % cycle.length];
	}
	return undefined;
}

function buildArchiveIntroText(
	type: SegmentType,
	title: string,
	creator: string,
	year: number,
	station: StationMeta
): string {
	if (type === 'COMEDY_SKETCH' || type === 'VARIETY_HOUR') {
		return `And now, ladies and gentlemen, ${station.callsign} clears the stage for tonight’s Variety and Vaudeville Half-Hour! From the parlor phonograph library comes ${creator}, presenting their celebrated ${year} comedy recording: "${title}." Sit back and enjoy a hearty chuckle across the ether.`;
	}
	if (type === 'CONCERT_HALL') {
		return `Good evening, music lovers. We take you remotely by special wire circuit to the ${station.concertHallName}, where tonight’s featured concert selection brings ${creator} performing "${title}," recorded in ${year}. Let us listen in to the orchestra hall.`;
	}
	return `We pause the telegraph wire for an authentic selection spinning on our studio Victrola — here is ${creator} playing "${title}," pressed on shellac in ${year}.`;
}

export function buildDeterministicBroadcast(
	isoDate: string,
	facts: IngestedFact[],
	stationId: StationId = 'wcrn'
): BroadcastDay {
	const station = STATION_META[stationId] ?? STATION_META.wcrn;
	const longDate = formatCenturyDateLong(isoDate);
	const targetYear = Number(isoDate.slice(0, 4)) || 1926;
	const targetMonth = Number(isoDate.slice(5, 7)) || 11;

	// Bucket ingested facts cleanly by role without duplication
	const exactEvents = facts.filter((f) => f.kind === 'event' && f.category !== 'developing_wire');
	const developingWire = facts.filter((f) => f.category === 'developing_wire');
	const deathFacts = facts.filter((f) => f.kind === 'death');
	const birthFacts = facts.filter((f) => f.kind === 'birth');

	const leadFact = exactEvents[0] ?? facts[0];
	const secondFact = exactEvents[1] ?? exactEvents[0] ?? facts[1] ?? leadFact;
	const thirdFact = exactEvents[2] ?? developingWire[0] ?? secondFact;
	const fourthFact = exactEvents[3] ?? developingWire[1] ?? thirdFact;

	const featureFact =
		exactEvents.find((f) => f.detailedContext && f.detailedContext.length > 80) ?? leadFact;
	const scienceFact =
		facts.find(
			(f) =>
				f.category === 'aviation' ||
				/radio|wire|wireless|telegraph|telephone|air|flight|television|rocket|science|rail/i.test(f.text)
		) ?? thirdFact;
	const commerceFact = facts.find((f) => f.category === 'commerce');
	const cultureOrSportsFact =
		facts.find((f) => f.category === 'sports' || f.category === 'culture') ?? secondFact;

	const usedTrackIds = new Set<string>();
	const segments: BroadcastSegment[] = [];
	let offset = 0;

	const pushSpoken = (
		id: string,
		type: SegmentType,
		title: string,
		showName: string,
		scriptText: string,
		moodTags: MoodTag[],
		topicTags: TopicTag[],
		sources: HistoricalSource[],
		isMultiVoice = false
	) => {
		const durationSec = estimateSpeechDuration(scriptText, 30, 260);
		segments.push({
			id,
			order: segments.length + 1,
			type,
			title,
			showName,
			speakerRole: getSpeakerLabelForSegment(type, isMultiVoice),
			isMultiVoice,
			scheduledOffsetSec: offset,
			durationSec,
			moodTags,
			topicTags,
			scriptText,
			audio: {
				sourceType: 'tts_blob',
				url: `/api/tts?date=${encodeURIComponent(isoDate)}&station=${station.stationId}&segment=${encodeURIComponent(id)}`,
				format: 'audio/mpeg',
				durationSec,
				voiceModel: getVoiceForSegment(type)
			},
			sources
		});
		offset += durationSec;
	};

	const pushArchiveShow = (
		id: string,
		type: 'MUSIC_INTERLUDE' | 'VARIETY_HOUR' | 'COMEDY_SKETCH' | 'CONCERT_HALL',
		showName: string,
		desiredMoods: MoodTag[],
		preferredCategory: TrackCategory,
		noteText: string
	) => {
		const track = pickTrackForBroadcast(
			targetYear,
			desiredMoods,
			`${isoDate}-${station.stationId}-${id}`,
			usedTrackIds,
			preferredCategory
		);
		usedTrackIds.add(track.identifier);

		const introText = buildArchiveIntroText(type, track.title, track.creator, track.year, station);
		const introDuration = estimateSpeechDuration(introText, 12, 35);
		const durationSec = introDuration + track.durationSec;

		segments.push({
			id,
			order: segments.length + 1,
			type,
			title: `${track.title} — ${track.creator} (${track.year})`,
			showName,
			speakerRole: getSpeakerLabelForSegment(type, false),
			scheduledOffsetSec: offset,
			durationSec,
			moodTags: desiredMoods,
			topicTags: ['culture'],
			introText,
			introAudioUrl: `/api/tts?date=${encodeURIComponent(isoDate)}&station=${station.stationId}&segment=${encodeURIComponent(id)}&part=intro`,
			scriptText: `${introText}\n\n[78rpm Shellac Spinning: "${track.title}" performed by ${track.creator}, recorded ${track.year} — ${noteText}]`,
			audio: {
				sourceType: 'internet_archive',
				url: `/api/archive-audio?id=${encodeURIComponent(track.identifier)}`,
				format: 'audio/mpeg',
				durationSec,
				archiveId: track.identifier
			},
			sources: [
				{
					provider: 'internet_archive',
					title: `Great 78 Project: ${track.title} — ${track.creator} (${track.year})`,
					url: `https://archive.org/details/${track.identifier}`,
					originalDate: String(track.year)
				}
			]
		});
		offset += durationSec;
	};

	// 01. STATION_ID — Formal Station Sign-On & Today's Exact Preview
	const leadHeadlineSnippet = leadFact
		? leadFact.text.slice(0, 140).replace(/[.]+$/, '')
		: 'major international diplomatic and commercial dispatches';
	pushSpoken(
		'seg-01-id',
		'STATION_ID',
		`${station.callsign} Sign-On & Evening Program Preview`,
		'Station Sign-On',
		`Good evening, ladies and gentlemen across the listening audience. This is ${station.callsign}, broadcasting by authority of the Federal Department of Commerce on ${station.frequencyKHz} kilocycles, or ${station.wavelengthMeters} meters on your dial.\n\nFrom our ${station.studioDesc}, we welcome your parlor to our continuous evening edition for ${longDate}.\n\nTonight’s schedule brings our lead wire coverage concerning ${leadHeadlineSnippet}, alongside authentic seventy-eight rpm recordings from the Great Seventy-Eight library, our Variety and Vaudeville Half-Hour, closing market quotations, an original multi-voice radio play from the Mystery Playhouse, and the evening Weather Bureau bulletin.`,
		['fireside'],
		['culture'],
		[
			{
				provider: 'curated_archive',
				title: `Department of Commerce ${station.frequencyKHz} kHz Assignment (${station.location})`,
				originalDate: isoDate
			}
		]
	);

	// 02. NEWS_BULLETIN — Lead World & National Wire (Exact-Day #1 & #2)
	const leadAttr = formatPressAttribution(leadFact);
	const secondPara =
		secondFact && secondFact.text !== leadFact?.text
			? `\n\nIn a companion dispatch reaching our wire room tonight: ${secondFact.text}${formatPressAttribution(secondFact)}`
			: '';
	const leadBase = `Flash from the Associated Press wire desk — ${leadFact ? leadFact.text : 'Diplomats and civic authorities confer tonight on pressing national affairs.'}${leadAttr}${secondPara}`;
	const leadScript = `${appendUniqueContext(leadBase, leadFact?.detailedContext)}\n\nCorrespondents stationed in Washington, London, and regional capitals report keen public interest as officials weigh the immediate consequences of today’s developments across civic and commercial life.`;
	const leadSources = [leadFact?.source, secondFact?.source].filter((s): s is HistoricalSource => Boolean(s));
	pushSpoken(
		'seg-02-lead-news',
		'NEWS_BULLETIN',
		leadFact?.source?.title ?? `Evening World & National Wire (${isoDate})`,
		'Evening AP Wire Desk',
		leadScript,
		['urgent'],
		['politics', 'commerce'],
		leadSources
	);

	// 03. MUSIC_INTERLUDE — Early Evening Ballroom & Hot Foxtrot
	pushArchiveShow(
		'seg-03-music-ballroom',
		'MUSIC_INTERLUDE',
		'Early Evening Ballroom Showcase',
		['upbeat', 'jazz'],
		stationId === 'wgn' ? 'ballroom' : 'jazz',
		'Presented live from the studio turntable with full carbon-microphone warmth.'
	);

	// 04. FEATURE_STORY — Special Correspondent Deep Dive
	const featureHeadline = featureFact
		? featureFact.text
		: `Looking deeper behind the major headlines shaping ${longDate}.`;
	const featureBody = appendUniqueContext(
		`Turning now to our Special Correspondent Feature — Tonight we examine the fuller story and human background behind ${featureFact?.source?.title ?? 'today’s principal dispatch'}.\n\n${featureHeadline}`,
		featureFact?.detailedContext
	);
	const featureOutro = `\n\nAs the evening hours advance across ${station.location} and neighboring states, eyewitnesses and editors alike observe that events of this ${targetYear} season are reshaping public expectations and daily life for millions of households.`;
	pushSpoken(
		'seg-04-feature',
		'FEATURE_STORY',
		`Special Report: ${featureFact?.source?.title ?? 'Behind Today’s Headlines'}`,
		'Special Correspondent Desk',
		`${featureBody}${featureOutro}`,
		['fireside', 'solemn'],
		['culture', 'politics'],
		featureFact ? [featureFact.source] : []
	);

	// 05. VINTAGE_AD — Sponsor 1
	const [ad1, ad2] = pickVintageAds(isoDate, station.stationId, 2);
	pushSpoken(
		'seg-05-ad-1',
		'VINTAGE_AD',
		ad1.title,
		`${ad1.sponsor} Feature`,
		ad1.scriptText,
		['fireside'],
		['commerce'],
		[
			{
				provider: 'curated_archive',
				title: ad1.sourceTitle,
				originalDate: String(targetYear)
			}
		]
	);

	// 06. VARIETY_HOUR — Authentic 1920s Comedy & Vaudeville Recording
	pushArchiveShow(
		'seg-06-variety-comedy',
		'VARIETY_HOUR',
		'The 1920s Variety & Vaudeville Hour',
		['upbeat', 'fireside'],
		'comedy',
		'Authentic period vaudeville & humor transcription from the Internet Archive Great 78 Project.'
	);

	// 07. MARKET_REPORT — NYSE (`wcrn`) or Chicago Board of Trade (`wgn`)
	pushSpoken(
		'seg-07-market',
		'MARKET_REPORT',
		station.stationId === 'wgn'
			? 'Chicago Board of Trade & LaSalle St. Closing Ticker'
			: 'Wall Street & Curb Exchange Closing Ticker',
		station.stationId === 'wgn' ? 'LaSalle St. Grain & Stock Desk' : 'Wall Street Closing Bell',
		buildMarketReport(isoDate, station.stationId, commerceFact),
		['upbeat'],
		['commerce'],
		[
			...(commerceFact ? [commerceFact.source] : []),
			{
				provider: 'curated_archive',
				title:
					station.stationId === 'wgn'
						? 'Chicago Board of Trade Closing Quotations Archive'
						: 'New York Financial Chronicle Closing Tape',
				originalDate: isoDate
			}
		]
	);

	// 08. MUSIC_INTERLUDE — Syncopated Jazz Showcase
	pushArchiveShow(
		'seg-08-music-jazz',
		'MUSIC_INTERLUDE',
		'Syncopated Jazz Interlude',
		['jazz', 'urgent'],
		'jazz',
		'Hot jazz arrangement direct from the studio acoustic phonograph.'
	);

	// 09. NEWS_BULLETIN — Developing Wire & Secondary Dispatches
	const wireParagraphs = [
		`Continuing our coverage of developing telegraph dispatches from the past forty-eight hours across North America and abroad — ${
			thirdFact ? thirdFact.text : 'Regional bureaus report steady industrial and civic activity.'
		}${formatPressAttribution(thirdFact)}`
	];
	if (fourthFact && fourthFact.text !== thirdFact?.text) {
		wireParagraphs.push(
			`Further word over the trunk lines notes that ${fourthFact.text}${formatPressAttribution(fourthFact)}`
		);
	}
	if (developingWire[0]?.detailedContext && !wireParagraphs.join(' ').includes(developingWire[0].detailedContext.slice(0, 40))) {
		wireParagraphs.push(developingWire[0].detailedContext);
	} else {
		wireParagraphs.push(
			`Our regional editors in Washington, Chicago, and London remain at the telegraph keys throughout the night to bring late-breaking confirmations to morning listeners.`
		);
	}
	pushSpoken(
		'seg-09-developing-wire',
		'NEWS_BULLETIN',
		`Developing Telegraph Wire (${isoDate})`,
		'Late Edition Wire Room',
		wireParagraphs.join('\n\n'),
		['urgent'],
		['politics', 'culture'],
		[thirdFact?.source, fourthFact?.source].filter((s): s is HistoricalSource => Boolean(s))
	);

	// 10. SCIENCE_AND_AVIATION — Wireless, Airmail & Technical Wonders
	const sciContext = scienceFact
		? `\n\nIn related scientific and technical dispatches this week: ${scienceFact.text}`
		: '';
	pushSpoken(
		'seg-10-science',
		'SCIENCE_AND_AVIATION',
		'Science, Aviation & Wireless Engineering Desk',
		'Modern Marvels Report',
		`From our desk of aeronautical and electrical progress — Across the ${targetYear} airway corridors, Department of Commerce beacons and Liberty-engined mail biplanes are transforming coast-to-coast postal dispatch.\n\nMeanwhile, radio engineers in laboratories from Schenectady to Chicago continue refining high-vacuum Radiotron tubes, crystal-controlled shortwave transmitters, and studio condenser microphones, shrinking the vast distances between farms, coastal liners, and great metropolitan halls.${sciContext}`,
		['upbeat'],
		['aviation', 'commerce'],
		scienceFact
			? [scienceFact.source]
			: [
					{
						provider: 'curated_archive',
						title: `Department of Commerce Airway & Radio Bulletin (${targetYear})`,
						originalDate: isoDate
					}
				]
	);

	// 11. VINTAGE_AD — Sponsor 2 (distinct from Sponsor 1)
	pushSpoken(
		'seg-11-ad-2',
		'VINTAGE_AD',
		ad2.title,
		`${ad2.sponsor} Announcement`,
		ad2.scriptText,
		['fireside'],
		['commerce'],
		[
			{
				provider: 'curated_archive',
				title: ad2.sourceTitle,
				originalDate: String(targetYear)
			}
		]
	);

	// 12. RADIO_DRAMA — Original Multi-Voice Radio Theatre
	const drama = pickRadioDrama(
		isoDate,
		station.stationId,
		leadFact?.text ?? 'urgent diplomatic cablegrams reached Manhattan tonight.'
	);
	pushSpoken(
		'seg-12-drama',
		'RADIO_DRAMA',
		`${drama.showName}: ${drama.title}`,
		drama.showName,
		drama.scriptText,
		['urgent', 'fireside'],
		['culture'],
		[
			{
				provider: 'curated_archive',
				title: `${station.callsign} Repertory Radio Theatre Script (${isoDate})`,
				originalDate: isoDate
			}
		],
		true
	);

	// 13. CONCERT_HALL — Classical / Salon Orchestra Remote
	pushArchiveShow(
		'seg-13-concert',
		'CONCERT_HALL',
		station.concertHallName,
		['fireside', 'solemn'],
		'classical',
		`Remote orchestra relay from ${station.concertHallName}.`
	);

	// 14. SPORTS_ROUNDUP — Season-Accurate Sports & Theatre Review
	const seasonalSports = getSeasonalSportsContext(targetMonth, targetYear, station.stationId);
	const sportsFactLine =
		cultureOrSportsFact && !seasonalSports.includes(cultureOrSportsFact.text.slice(0, 32))
			? `\n\nIn today’s cultural and sporting notes: ${cultureOrSportsFact.text}`
			: '';
	pushSpoken(
		'seg-14-sports',
		'SPORTS_ROUNDUP',
		station.stationId === 'wgn' ? 'Midwest Sports Desk & Loop Stage Review' : 'Sporting Arena & Broadway Marquee Wire',
		'Sports & Stage Wire',
		`${seasonalSports}${sportsFactLine}`,
		['upbeat', 'jazz'],
		['sports', 'culture'],
		cultureOrSportsFact ? [cultureOrSportsFact.source] : []
	);

	// 15. OBITUARY_WIRE — Telegraph Notices, Passings & Milestones
	const obituaryParagraphs: string[] = [];
	const obituarySources: HistoricalSource[] = [];
	if (deathFacts.length > 0) {
		obituaryParagraphs.push(
			`We pause the lighter rhythms of the evening to share solemn dispatches and telegraph notices of notable figures whose passing was recorded on ${longDate}.`
		);
		for (const df of deathFacts.slice(0, 3)) {
			const line = df.detailedContext
				? `${df.text} ${df.detailedContext}`
				: df.text;
			obituaryParagraphs.push(line);
			obituarySources.push(df.source);
		}
	} else if (birthFacts.length > 0) {
		obituaryParagraphs.push(
			`From our civic registry and society columns on ${longDate}, we note notable announcements and milestone dispatches recorded across the country.`
		);
		for (const bf of birthFacts.slice(0, 2)) {
			obituaryParagraphs.push(bf.text);
			obituarySources.push(bf.source);
		}
	} else {
		obituaryParagraphs.push(
			`From our international courier desk on ${longDate}, dispatches from London, Paris, and Geneva underscore the swift diplomatic and cultural exchanges uniting postwar capitals.\n\nCivic societies, municipal libraries, and lecture halls report record autumn and winter attendance as citizens debate modern industry, wireless telegraphy, and transatlantic commerce.`
		);
	}
	pushSpoken(
		'seg-15-obituary-wire',
		'OBITUARY_WIRE',
		deathFacts.length > 0 ? `In Memoriam & Telegraph Notices (${isoDate})` : `Civic & International Wire Notes (${isoDate})`,
		'Telegraph Notices & Registry',
		obituaryParagraphs.join('\n\n'),
		['solemn', 'fireside'],
		['culture', 'politics'],
		obituarySources
	);

	// 16. MUSIC_INTERLUDE — Late Evening Blues & Parlor Ballad
	pushArchiveShow(
		'seg-16-music-late',
		'MUSIC_INTERLUDE',
		'Midnight Blues & Parlor Serenade',
		['solemn', 'jazz'],
		'blues',
		'Late evening 78rpm acoustic blues & parlor pressing.'
	);

	// 17. WEATHER_REPORT — Season- & Region-Accurate U.S. Weather Bureau
	pushSpoken(
		'seg-17-weather',
		'WEATHER_REPORT',
		station.stationId === 'wgn'
			? 'U.S. Weather Bureau Great Lakes & Prairie Forecast'
			: 'U.S. Weather Bureau Atlantic Seaboard & Harbor Forecast',
		'U.S. Weather Bureau',
		buildSeasonalWeatherReport(isoDate, station.stationId),
		['solemn'],
		['weather'],
		[
			{
				provider: 'curated_archive',
				title: `U.S. Weather Bureau Daily Bulletin (${station.location}, ${isoDate})`,
				originalDate: isoDate
			}
		]
	);

	// 18. FIRESIDE_EDITORIAL — Reflective Sign-Off
	const closingAnchor = leadFact?.source?.title
		? `From tonight’s word on ${leadFact.source.title} to the melodies echoing out of our studio horn, `
		: '';
	pushSpoken(
		'seg-18-editorial',
		'FIRESIDE_EDITORIAL',
		`Fireside Editorial & ${station.callsign} Sign-Off`,
		'Fireside Reflections',
		`As the late evening hour deepens and the warm amber glow of your receiver’s vacuum tubes lights the parlor, we pause to reflect upon ${longDate}.\n\n${closingAnchor}never before in human annals have millions of families separated by prairies, rivers, and mountain ranges listened together to the same news dispatches, the same plays, and the same immortal music in the fleeting instant of broadcast.\n\nOn behalf of our announcers, dramatic cast, and engineering staff at ${station.callsign} in ${station.location}, we bid you a peaceful night. Keep your dial set near ${station.frequencyKHz} kilocycles tomorrow, as our continuous transmission resumes at the top of the cycle. Good night, and pleasant dreams.`,
		['fireside', 'solemn'],
		['culture'],
		[
			{
				provider: 'curated_archive',
				title: `${station.callsign} Evening Continuity Archive (${isoDate})`,
				originalDate: isoDate
			}
		]
	);

	const clippings = buildNewspaperClippings(isoDate, facts, segments);
	const morseDispatch = buildMorseDispatch(isoDate, station, facts);

	return {
		schemaVersion: 3,
		id: isoDate,
		stationId: station.stationId,
		stationCallsign: station.callsign,
		stationLocation: station.location,
		targetFrequencyKHz: station.frequencyKHz,
		wavelengthMeters: station.wavelengthMeters,
		totalDurationSec: offset,
		morseDispatch,
		clippings,
		segments,
		generatedBy: 'deterministic',
		generatedAt: new Date().toISOString()
	};
}

export type LlmProvider = 'deepseek' | 'gemini';

const ALLOWED_LLM_SEGMENT_TYPES: SegmentType[] = [
	'STATION_ID',
	'NEWS_BULLETIN',
	'FEATURE_STORY',
	'MUSIC_INTERLUDE',
	'MARKET_REPORT',
	'SCIENCE_AND_AVIATION',
	'SPORTS_ROUNDUP',
	'VINTAGE_AD',
	'WEATHER_REPORT',
	'FIRESIDE_EDITORIAL',
	'RADIO_DRAMA',
	'VARIETY_HOUR',
	'COMEDY_SKETCH',
	'CONCERT_HALL',
	'OBITUARY_WIRE'
];

const VALID_SEGMENT_TYPE_SET = new Set<SegmentType>(ALLOWED_LLM_SEGMENT_TYPES);
const SEGMENT_TYPE_SYNONYMS: Record<string, SegmentType> = {
	INTRO: 'STATION_ID',
	SIGN_ON: 'STATION_ID',
	NEWS: 'NEWS_BULLETIN',
	BULLETIN: 'NEWS_BULLETIN',
	FEATURE: 'FEATURE_STORY',
	INTERVIEW: 'FEATURE_STORY',
	COMMENTARY: 'FIRESIDE_EDITORIAL',
	MUSIC: 'MUSIC_INTERLUDE',
	MARKET: 'MARKET_REPORT',
	MARKETS: 'MARKET_REPORT',
	SCIENCE: 'SCIENCE_AND_AVIATION',
	AVIATION: 'SCIENCE_AND_AVIATION',
	SPORTS: 'SPORTS_ROUNDUP',
	AD: 'VINTAGE_AD',
	COMMERCIAL: 'VINTAGE_AD',
	WEATHER: 'WEATHER_REPORT',
	EDITORIAL: 'FIRESIDE_EDITORIAL',
	OUTRO: 'FIRESIDE_EDITORIAL',
	DRAMA: 'RADIO_DRAMA',
	VARIETY: 'VARIETY_HOUR',
	COMEDY: 'COMEDY_SKETCH',
	CONCERT: 'CONCERT_HALL',
	OBITUARY: 'OBITUARY_WIRE'
};
const VALID_MOOD_SET = new Set<MoodTag>(['urgent', 'solemn', 'upbeat', 'jazz', 'fireside']);
const VALID_TOPIC_SET = new Set<TopicTag>([
	'politics',
	'aviation',
	'sports',
	'culture',
	'weather',
	'commerce'
]);

export function resolveProviderOrder(primaryPref?: string): LlmProvider[] {
	if (primaryPref?.trim().toLowerCase() === 'gemini') {
		return ['gemini', 'deepseek'];
	}
	return ['deepseek', 'gemini'];
}

export function parseLlmBroadcastJson(rawText: string): GeneratedSegmentPayload[] | null {
	const cleaned = rawText
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();
	if (!cleaned) return null;

	try {
		const parsed = JSON.parse(cleaned) as { segments?: Array<Record<string, unknown>> };
		if (!Array.isArray(parsed.segments) || parsed.segments.length < 10) {
			return null;
		}

		const normalized: GeneratedSegmentPayload[] = [];
		for (const rawSeg of parsed.segments) {
			if (!rawSeg || typeof rawSeg !== 'object') continue;
			const title = typeof rawSeg.title === 'string' ? rawSeg.title.trim() : '';
			const scriptText = typeof rawSeg.scriptText === 'string' ? rawSeg.scriptText.trim() : '';
			if (!title || !scriptText) continue;

			const rawKey = typeof rawSeg.type === 'string' ? rawSeg.type.trim().toUpperCase() : '';
			const mapped = SEGMENT_TYPE_SYNONYMS[rawKey] ?? (rawKey as SegmentType);
			const type: SegmentType = VALID_SEGMENT_TYPE_SET.has(mapped) ? mapped : 'NEWS_BULLETIN';

			const moodTags = Array.isArray(rawSeg.moodTags)
				? rawSeg.moodTags
						.map((m) => (typeof m === 'string' ? (m.trim().toLowerCase() as MoodTag) : null))
						.filter((m): m is MoodTag => m !== null && VALID_MOOD_SET.has(m))
				: [];

			const topicTags = Array.isArray(rawSeg.topicTags)
				? rawSeg.topicTags
						.map((t) => (typeof t === 'string' ? (t.trim().toLowerCase() as TopicTag) : null))
						.filter((t): t is TopicTag => t !== null && VALID_TOPIC_SET.has(t))
				: [];

			const rawDur = typeof rawSeg.durationSec === 'number' ? Math.round(rawSeg.durationSec) : 0;

			normalized.push({
				type,
				title,
				showName: typeof rawSeg.showName === 'string' ? rawSeg.showName.trim() : undefined,
				scriptText,
				introText: typeof rawSeg.introText === 'string' ? rawSeg.introText.trim() : undefined,
				durationSec: rawDur,
				isMultiVoice: Boolean(rawSeg.isMultiVoice),
				moodTags: moodTags.length > 0 ? moodTags : ['fireside'],
				topicTags: topicTags.length > 0 ? topicTags : ['culture']
			});
		}

		return normalized.length >= 10 ? normalized : null;
	} catch {
		return null;
	}
}

export async function requestDeepseekBroadcastJson(
	systemPrompt: string,
	userPrompt: string,
	apiKey: string,
	model = 'deepseek-flash',
	fetchImpl: typeof fetch = fetch
): Promise<string> {
	const res = await fetchImpl('https://api.deepseek.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			thinking: { type: 'disabled' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0.7,
			max_tokens: 8192
		}),
		signal: AbortSignal.timeout(50000)
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		throw new Error(`DeepSeek API failed (${res.status}): ${errText.slice(0, 200)}`);
	}

	const data = (await res.json()) as {
		choices?: Array<{ message?: { content?: string | null } }>;
	};
	const content = data.choices?.[0]?.message?.content?.trim();
	if (!content) {
		throw new Error('DeepSeek API returned empty message content');
	}
	return content;
}

async function requestGeminiBroadcastJson(
	prompt: string,
	schema: Record<string, unknown>,
	apiKey: string
): Promise<string> {
	const ai = new GoogleGenAI({ apiKey });
	const interaction = await ai.interactions.create({
		model: 'gemini-3.8-flash',
		input: prompt,
		store: false,
		response_format: {
			type: 'text',
			mime_type: 'application/json',
			schema
		}
	});
	const rawText = interaction.output_text?.trim();
	if (!rawText) {
		throw new Error('Gemini API returned empty output_text');
	}
	return rawText;
}

function materializeGeneratedBroadcast(
	isoDate: string,
	facts: IngestedFact[],
	station: StationMeta,
	parsedSegments: GeneratedSegmentPayload[],
	generatedBy: string
): BroadcastDay {
	const targetYear = Number(isoDate.slice(0, 4)) || 1926;
	const usedTrackIds = new Set<string>();
	let offset = 0;

	const segments: BroadcastSegment[] = parsedSegments.map((seg, idx) => {
		const id = `seg-${String(idx + 1).padStart(2, '0')}-${seg.type.toLowerCase().replace(/_/g, '-')}`;
		const isArchive = isArchiveMusicType(seg.type);
		const moodTags = seg.moodTags.slice(0, 2);
		const preferredCat = pickCategoryForSegment(seg.type, idx);
		const track = isArchive
			? pickTrackForBroadcast(targetYear, moodTags, `${isoDate}-${station.stationId}-${id}`, usedTrackIds, preferredCat)
			: null;
		if (track) usedTrackIds.add(track.identifier);

		const introText = track
			? seg.introText?.trim() || buildArchiveIntroText(seg.type, track.title, track.creator, track.year, station)
			: undefined;
		const introDur = introText ? estimateSpeechDuration(introText, 12, 35) : 0;
		const durationSec = track
			? introDur + track.durationSec
			: seg.durationSec > 20
				? seg.durationSec
				: estimateSpeechDuration(seg.scriptText, 24, 260);
		const isMultiVoice = Boolean(seg.isMultiVoice || seg.type === 'RADIO_DRAMA');

		const item: BroadcastSegment = {
			id,
			order: idx + 1,
			type: seg.type,
			title: track ? `${track.title} — ${track.creator} (${track.year})` : seg.title,
			showName: seg.showName || seg.title,
			speakerRole: getSpeakerLabelForSegment(seg.type, isMultiVoice),
			isMultiVoice,
			scheduledOffsetSec: offset,
			durationSec,
			moodTags,
			topicTags: seg.topicTags.slice(0, 2),
			introText,
			introAudioUrl: track
				? `/api/tts?date=${encodeURIComponent(isoDate)}&station=${station.stationId}&segment=${encodeURIComponent(id)}&part=intro`
				: undefined,
			scriptText: track
				? `${introText}\n\n[78rpm Shellac Spinning: "${track.title}" by ${track.creator}, ${track.year}]`
				: seg.scriptText,
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
						url: `/api/tts?date=${encodeURIComponent(isoDate)}&station=${station.stationId}&segment=${encodeURIComponent(id)}`,
						format: 'audio/mpeg',
						durationSec,
						voiceModel: getVoiceForSegment(seg.type)
					},
			sources: track
				? [
						{
							provider: 'internet_archive',
							title: `Great 78 Project: ${track.title} — ${track.creator} (${track.year})`,
							url: `https://archive.org/details/${track.identifier}`,
							originalDate: String(track.year)
						}
					]
				: facts.slice(0, 3).map((f) => f.source)
		};
		offset += durationSec;
		return item;
	});

	return {
		schemaVersion: 3,
		id: isoDate,
		stationId: station.stationId,
		stationCallsign: station.callsign,
		stationLocation: station.location,
		targetFrequencyKHz: station.frequencyKHz,
		wavelengthMeters: station.wavelengthMeters,
		totalDurationSec: offset,
		morseDispatch: buildMorseDispatch(isoDate, station, facts),
		clippings: buildNewspaperClippings(isoDate, facts, segments),
		segments,
		generatedBy,
		generatedAt: new Date().toISOString()
	};
}

export async function generateBroadcastDay(
	isoDate: string,
	facts: IngestedFact[],
	stationId: StationId = 'wcrn'
): Promise<BroadcastDay> {
	const primaryPref = env.LLM_PRIMARY_PROVIDER || process.env.LLM_PRIMARY_PROVIDER;
	const deepseekKey = env.DEEPSEEK_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
	const deepseekModel =
		env.DEEPSEEK_MODEL?.trim() || process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash';
	const geminiKey = env.GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();

	if (!deepseekKey && !geminiKey) {
		return buildDeterministicBroadcast(isoDate, facts, stationId);
	}

	const station = STATION_META[stationId] ?? STATION_META.wcrn;
	const longDate = formatCenturyDateLong(isoDate);
	const targetYear = Number(isoDate.slice(0, 4)) || 1926;

	const factsSummary = facts
		.map((f, idx) => {
			const entities = f.relatedEntities?.length ? ` (Entities: ${f.relatedEntities.join(', ')})` : '';
			const press = f.pressCitations?.length
				? ` [Press: ${f.pressCitations.map((p) => `${p.newspaper}: "${p.headline}"`).join('; ')}]`
				: '';
			const context = f.detailedContext ? `\n   Background context: ${f.detailedContext}` : '';
			return `${idx + 1}. [${f.kind} | ${f.category ?? 'general'} | ${f.date}] ${f.text}${entities}${press}${context}`;
		})
		.join('\n\n');

	const systemPrompt = `You are the chief continuity writer and news director for 1920s American AM radio station ${station.callsign} (${station.frequencyKHz} kHz, ${station.wavelengthMeters} meters, ${station.location}).
You MUST respond strictly with a valid JSON object matching this exact structure (no markdown prose outside JSON):
{
  "segments": [
    {
      "type": "STATION_ID | NEWS_BULLETIN | FEATURE_STORY | MUSIC_INTERLUDE | MARKET_REPORT | SCIENCE_AND_AVIATION | SPORTS_ROUNDUP | VINTAGE_AD | WEATHER_REPORT | FIRESIDE_EDITORIAL | RADIO_DRAMA | VARIETY_HOUR | COMEDY_SKETCH | CONCERT_HALL | OBITUARY_WIRE",
      "title": "string",
      "showName": "string",
      "scriptText": "string (multi-paragraph prose separated by \\n\\n)",
      "introText": "optional string (spoken intro for MUSIC_INTERLUDE, VARIETY_HOUR, COMEDY_SKETCH, CONCERT_HALL)",
      "durationSec": 60,
      "isMultiVoice": false,
      "moodTags": ["urgent" | "solemn" | "upbeat" | "jazz" | "fireside"],
      "topicTags": ["politics" | "aviation" | "sports" | "culture" | "weather" | "commerce"]
    }
  ]
}`;

	const userPrompt = `Today is ${longDate} (${isoDate}). You are broadcasting LIVE in the year ${targetYear}. Return a complete 16-to-18 segment JSON broadcast object covering TODAY's actual historical events, shows, comedy, music, markets, drama, obituaries, and regional weather.

MANDATE - AUTHENTIC NON-STOP RADIO PROGRAMMING:
Every spoken journalism or dramatic segment MUST be rich multi-paragraph radio prose (140–220 words, 2–3 full paragraphs separated by \\n\\n). Never write 1-sentence headline summaries.
For MUSIC_INTERLUDE, VARIETY_HOUR, and CONCERT_HALL segments, provide a vivid 2–3 sentence studio introduction in introText and keep scriptText to a brief 1-sentence placeholder (the studio attaches the real 78rpm record automatically).

Include this complete station broadcast sequence:
1. STATION_ID: Formal sign-on from ${station.studioDesc} previewing today's actual lead headlines.
2. NEWS_BULLETIN: Lead World & National Wire deep dive covering today's top exact-day events + press attribution.
3. MUSIC_INTERLUDE: Provide introText introducing a 1920s 78rpm ballroom/jazz record.
4. FEATURE_STORY: Special Correspondent narrative exploring the human drama behind today's biggest story.
5. VINTAGE_AD: Authentic ${targetYear} sponsor commercial with period pricing.
6. VARIETY_HOUR: Provide introText introducing a classic 1920s comedy/vaudeville 78rpm record.
7. MARKET_REPORT: ${station.stationId === 'wgn' ? 'Chicago Board of Trade grain/livestock & LaSalle St. closing stocks' : 'Wall Street & Curb Exchange closing stocks, call money & commodities'}.
8. MUSIC_INTERLUDE: Provide introText for a hot jazz 78rpm interlude.
9. NEWS_BULLETIN: Developing telegraph dispatches from the past 48 hours.
10. SCIENCE_AND_AVIATION: ${targetYear} aviation, airmail beacons, radio engineering, or science news.
11. VINTAGE_AD: Second distinct ${targetYear} sponsor read.
12. RADIO_DRAMA: Original 4-voice radio play woven with today's date & news! Format each paragraph with speaker prefixes: ANNOUNCER:, CLARA:, INSPECTOR:, REPORTER:. Set isMultiVoice: true.
13. CONCERT_HALL: Provide introText introducing a remote orchestra concert from ${station.concertHallName}.
14. SPORTS_ROUNDUP: Season-accurate sports & stage/Broadway/Loop theater review for month ${isoDate.slice(5, 7)} of ${targetYear}.
15. OBITUARY_WIRE: Telegraph Notices & In Memoriam covering notable passings or civic announcements from the dispatches.
16. MUSIC_INTERLUDE: Late evening 78rpm blues/ballroom selection (with introText).
17. WEATHER_REPORT: Season-accurate U.S. Weather Bureau dispatch for ${station.location} and surrounding shipping lanes.
18. FIRESIDE_EDITORIAL: Reflective evening sign-off referencing today's events.

RULES:
- PRESENT TENSE ONLY: It is happening TODAY in ${targetYear}. Never say "100 years ago".
- NEVER duplicate paragraphs or repeat the exact same sentences across scriptText and introText.
- FORMAT: Separate paragraphs with \\n\\n.

Historical Dispatches & Context for ${isoDate}:
${factsSummary}`;

	const broadcastJsonSchema: Record<string, unknown> = {
		type: 'object',
		properties: {
			segments: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						type: { type: 'string', enum: ALLOWED_LLM_SEGMENT_TYPES },
						title: { type: 'string' },
						showName: { type: 'string' },
						scriptText: { type: 'string' },
						introText: { type: 'string' },
						durationSec: { type: 'integer' },
						isMultiVoice: { type: 'boolean' },
						moodTags: { type: 'array', items: { type: 'string' } },
						topicTags: { type: 'array', items: { type: 'string' } }
					},
					required: ['type', 'title', 'scriptText', 'durationSec', 'moodTags', 'topicTags']
				}
			}
		},
		required: ['segments']
	};

	for (const provider of resolveProviderOrder(primaryPref)) {
		if (provider === 'deepseek' && deepseekKey) {
			try {
				const rawText = await requestDeepseekBroadcastJson(
					systemPrompt,
					userPrompt,
					deepseekKey,
					deepseekModel
				);
				const parsed = parseLlmBroadcastJson(rawText);
				if (parsed) {
					return materializeGeneratedBroadcast(isoDate, facts, station, parsed, deepseekModel);
				}
			} catch {
				// Fall through to next provider
			}
		} else if (provider === 'gemini' && geminiKey) {
			try {
				const rawText = await requestGeminiBroadcastJson(
					`${systemPrompt}\n\n${userPrompt}`,
					broadcastJsonSchema,
					geminiKey
				);
				const parsed = parseLlmBroadcastJson(rawText);
				if (parsed) {
					return materializeGeneratedBroadcast(isoDate, facts, station, parsed, 'gemini-3.8-flash');
				}
			} catch {
				// Fall through to next provider
			}
		}
	}

	return buildDeterministicBroadcast(isoDate, facts, stationId);
}
