import { fetchChroniclingAmerica } from './chroniclingAmerica';
import { fetchPeriodContext } from './periodContext';
import { fetchVintageChronicles } from './vintageChronicles';
import { fetchWikimediaOnThisDay, type IngestedFact } from './wikimedia';

export function offsetIsoDate(isoDate: string, daysDelta: number): string {
	const [y, m, d] = isoDate.split('-').map(Number);
	const date = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + daysDelta));
	return date.toISOString().slice(0, 10);
}

const CURATED_1920S_BACKSTOP: IngestedFact[] = [
	{
		kind: 'event',
		year: 1926,
		date: '1926-11-15',
		text: 'The National Broadcasting Company inaugurates its coast-to-coast radio network from the Grand Ballroom of the Waldorf-Astoria in New York.',
		source: {
			provider: 'curated_archive',
			title: 'NBC Inaugural Broadcast Archive (Nov 1926)',
			url: 'https://en.wikipedia.org/wiki/NBC',
			originalDate: '1926-11-15'
		},
		detailedContext:
			'Under the direction of David Sarnoff and Merlin Aylesworth, NBC linked twenty-four stations across the country with leased telephone circuits, reaching an estimated five million listeners with the New York Philharmonic and Will Rogers.',
		category: 'culture',
		relatedEntities: ['NBC', 'David Sarnoff', 'Waldorf-Astoria', 'Will Rogers']
	},
	{
		kind: 'event',
		year: 1926,
		date: '1926-11-11',
		text: 'Federal highway authorities formalize the numbering of U.S. Route 66 linking Chicago to Los Angeles.',
		source: {
			provider: 'curated_archive',
			title: 'U.S. Highway System Designation (1926)',
			url: 'https://en.wikipedia.org/wiki/U.S._Route_66',
			originalDate: '1926-11-11'
		},
		detailedContext:
			'Connecting Lake Michigan with the Pacific Ocean across eight states, Route 66 was established to provide a continuous paved and gravel corridor for freight trucking and transcontinental motoring.',
		category: 'commerce',
		relatedEntities: ['U.S. Route 66', 'Highway System', 'Cyrus Avery']
	},
	{
		kind: 'event',
		year: 1926,
		date: '1926-11-15',
		text: 'Wall Street investment houses report record manufacturing output and corporate dividend declarations across automotive and electrical equipment manufacturers.',
		source: {
			provider: 'curated_archive',
			title: 'Commercial & Financial Chronicle (1926)',
			url: 'https://en.wikipedia.org/wiki/Wall_Street',
			originalDate: '1926-11-15'
		},
		detailedContext:
			'U.S. Steel and General Electric shares led an active advance on the floor of the New York Stock Exchange amidst heavy institutional accumulation and steady commercial call money rates.',
		category: 'commerce',
		relatedEntities: ['New York Stock Exchange', 'U.S. Steel', 'General Electric']
	},
	{
		kind: 'event',
		year: 1926,
		date: '1926-11-15',
		text: 'The Aeronautics Branch of the Department of Commerce accelerates installation of night airway beacons for transcontinental airmail delivery.',
		source: {
			provider: 'curated_archive',
			title: 'Aeronautics Branch Airway Bulletin',
			url: 'https://en.wikipedia.org/wiki/Air_Commerce_Act',
			originalDate: '1926-11-15'
		},
		detailedContext:
			'Rotating incandescent beacons spaced every ten miles across the Allegheny mountains and Midwest plains enable postal aviators flying Liberty-powered biplanes to maintain regular nocturnal delivery schedules between New York and California.',
		category: 'aviation',
		relatedEntities: ['Air Mail', 'Department of Commerce', 'Transcontinental Airway']
	},
	{
		kind: 'event',
		year: 1926,
		date: '1926-11-15',
		text: 'Sports promoters and baseball executives review a record-setting athletic campaign following the 1926 World Series.',
		source: {
			provider: 'curated_archive',
			title: 'Associated Press Sports Desk Wire',
			url: 'https://en.wikipedia.org/wiki/1926_World_Series',
			originalDate: '1926-11-15'
		},
		detailedContext:
			'With Babe Ruth’s three home run game in St. Louis and the Gene Tunney-Jack Dempsey championship bout drawing unprecedented crowds, athletic spectacles have achieved national mass entertainment status.',
		category: 'sports',
		relatedEntities: ['Babe Ruth', 'Gene Tunney', 'Jack Dempsey', 'World Series']
	},
	{
		kind: 'event',
		year: 1926,
		date: '1926-11-15',
		text: 'Wireless engineers complete successful test transmissions on short-wave transatlantic telegraph circuits.',
		source: {
			provider: 'curated_archive',
			title: 'Marconi Wireless & RCA Experimental Bulletin',
			url: 'https://en.wikipedia.org/wiki/Radio_Corporation_of_America',
			originalDate: '1926-11-15'
		},
		detailedContext:
			'High-frequency directional beam transmitters operated by RCA and the British Marconi Company demonstrated superior signal clarity across the North Atlantic with reduced static and lower power requirements.',
		category: 'culture',
		relatedEntities: ['RCA', 'Marconi Wireless', 'Shortwave Radio']
	}
];

export async function ingestHistoricalFacts(isoDate: string): Promise<IngestedFact[]> {
	const prevDate1 = offsetIsoDate(isoDate, -1);
	const prevDate2 = offsetIsoDate(isoDate, -2);

	// Concurrent fetch: Target Date feeds + Rolling Preceding Days feeds
	const [targetWiki, targetLoc, targetPeriod, targetVintage, prev1Wiki, prev2Wiki] =
		await Promise.all([
			fetchWikimediaOnThisDay(isoDate).catch(() => []),
			fetchChroniclingAmerica(isoDate).catch(() => []),
			fetchPeriodContext(isoDate).catch(() => []),
			fetchVintageChronicles(isoDate).catch(() => []),
			fetchWikimediaOnThisDay(prevDate1).catch(() => []),
			fetchWikimediaOnThisDay(prevDate2).catch(() => [])
		]);

	const seenTexts = new Set<string>();
	const result: IngestedFact[] = [];

	const addFact = (f: IngestedFact, isDeveloping = false) => {
		const norm = f.text.trim().toLowerCase().slice(0, 80);
		if (!seenTexts.has(norm)) {
			seenTexts.add(norm);
			if (isDeveloping) {
				result.push({
					...f,
					category: 'developing_wire',
					detailedContext: f.detailedContext
						? `[Developing wire from ${f.date}]: ${f.detailedContext}`
						: `[Continuing coverage from ${f.date}]`
				});
			} else {
				result.push(f);
			}
		}
	};

	// 1. Primary Target Date dispatches
	for (const f of targetWiki) addFact(f);
	for (const f of targetLoc) addFact(f);
	for (const f of targetPeriod) addFact(f);
	for (const f of targetVintage) addFact(f);

	// 2. Rolling window preceding days (developing wire stories)
	for (const f of prev1Wiki.slice(0, 3)) addFact(f, true);
	for (const f of prev2Wiki.slice(0, 2)) addFact(f, true);

	if (result.length >= 6) {
		return result.slice(0, 16);
	}

	// 3. Fallback to backstop if sparse
	const year = Number(isoDate.slice(0, 4)) || 1926;
	for (const item of CURATED_1920S_BACKSTOP) {
		addFact({
			...item,
			year,
			date: isoDate
		});
	}

	return result;
}
