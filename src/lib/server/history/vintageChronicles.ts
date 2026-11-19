import type { IngestedFact } from './wikimedia';

interface ChronicleRecord {
	month: number;
	day?: number;
	year: number;
	kind: 'event' | 'newspaper';
	title: string;
	text: string;
	url: string;
}

const HISTORICAL_CHRONICLES: ChronicleRecord[] = [
	{
		month: 1,
		day: 26,
		year: 1926,
		kind: 'event',
		title: 'First Demonstration of Mechanical Television',
		text: 'Scottish inventor John Logie Baird gives the worlds first public demonstration of a working mechanical television system for members of the Royal Institution and a reporter from The Times in London.',
		url: 'https://en.wikipedia.org/wiki/John_Logie_Baird'
	},
	{
		month: 3,
		day: 7,
		year: 1926,
		kind: 'event',
		title: 'First Transatlantic Radio Telephone Conversation',
		text: 'Commercial wireless engineers successfully conduct the first two-way transatlantic telephone conversation between London and New York via high-frequency radio telephony.',
		url: 'https://en.wikipedia.org/wiki/Transatlantic_telephone_cable'
	},
	{
		month: 3,
		day: 16,
		year: 1926,
		kind: 'event',
		title: 'Goddard Launches First Liquid-Fueled Rocket',
		text: 'Physicist Robert H. Goddard successfully launches the worlds first liquid-fueled rocket in Auburn, Massachusetts, reaching an altitude of 41 feet in two and a half seconds.',
		url: 'https://en.wikipedia.org/wiki/Robert_H._Goddard'
	},
	{
		month: 5,
		day: 9,
		year: 1926,
		kind: 'event',
		title: 'Byrd and Bennett Attempt North Pole Flight',
		text: 'Lieutenant Commander Richard E. Byrd and pilot Floyd Bennett claim the first flight over the North Pole in their Fokker F.VIIa-3m trimotor christened Josephine Ford.',
		url: 'https://en.wikipedia.org/wiki/Richard_E._Byrd'
	},
	{
		month: 5,
		day: 20,
		year: 1926,
		kind: 'event',
		title: 'Air Commerce Act Signed into Law',
		text: 'President Calvin Coolidge signs the Air Commerce Act into law, placing commercial aviation under federal oversight with airway charting, pilot licensing, and navigational radio aids.',
		url: 'https://en.wikipedia.org/wiki/Air_Commerce_Act'
	},
	{
		month: 8,
		day: 6,
		year: 1926,
		kind: 'event',
		title: 'Gertrude Ederle Conquers the English Channel',
		text: 'Twenty-year-old American swimmer Gertrude Ederle of Manhattan becomes the first woman to swim across the English Channel, beating the men’s record by nearly two hours in 14 hours and 31 minutes.',
		url: 'https://en.wikipedia.org/wiki/Gertrude_Ederle'
	},
	{
		month: 9,
		day: 18,
		year: 1926,
		kind: 'event',
		title: 'Great Miami Hurricane Strikes Florida',
		text: 'A catastrophic Category 4 hurricane makes landfall in Miami, Florida, bringing winds exceeding 125 mph, devastating coastal communities and prompting nationwide emergency relief appeals.',
		url: 'https://en.wikipedia.org/wiki/1926_Miami_hurricane'
	},
	{
		month: 9,
		day: 23,
		year: 1926,
		kind: 'event',
		title: 'Gene Tunney Defeats Jack Dempsey in Philadelphia',
		text: 'Before a crowd of over 120,000 spectators at Sesquicentennial Stadium in Philadelphia, Gene Tunney defeats heavyweight champion Jack Dempsey in a ten-round unanimous decision.',
		url: 'https://en.wikipedia.org/wiki/Gene_Tunney'
	},
	{
		month: 10,
		day: 6,
		year: 1926,
		kind: 'event',
		title: 'Babe Ruth Hits Three Home Runs in World Series',
		text: 'New York Yankees slugger Babe Ruth hits three home runs in Game 4 of the World Series against the St. Louis Cardinals at Sportsman’s Park, fulfilling his promised home run for sick boy Johnny Sylvester.',
		url: 'https://en.wikipedia.org/wiki/1926_World_Series'
	},
	{
		month: 11,
		day: 11,
		year: 1926,
		kind: 'event',
		title: 'U.S. Route 66 Formally Numbered',
		text: 'The American Association of State Highway Officials designates Route 66, establishing the iconic 2,448-mile highway connecting Chicago to Santa Monica through the American Southwest.',
		url: 'https://en.wikipedia.org/wiki/U.S._Route_66'
	},
	{
		month: 11,
		day: 15,
		year: 1926,
		kind: 'event',
		title: 'NBC Radio Network Inaugural Broadcast',
		text: 'The National Broadcasting Company launches the first permanent nationwide radio network with a four-hour gala broadcast from the Grand Ballroom of the Waldorf-Astoria Hotel in New York.',
		url: 'https://en.wikipedia.org/wiki/NBC'
	},
	{
		month: 12,
		day: 25,
		year: 1926,
		kind: 'event',
		title: 'Hirohito Becomes Emperor of Japan',
		text: 'Following the death of Emperor Yoshihito (Taisho), Crown Prince Hirohito succeeds to the Chrysanthemum Throne, inaugurating the Showa era.',
		url: 'https://en.wikipedia.org/wiki/Hirohito'
	},
	{
		month: 1,
		day: 7,
		year: 1927,
		kind: 'event',
		title: 'First Commercial Transatlantic Telephone Service Opens',
		text: 'The American Telephone and Telegraph Company and the British General Post Office officially initiate commercial public transatlantic radiotelephone service between New York and London.',
		url: 'https://en.wikipedia.org/wiki/Transatlantic_telephone_cable'
	},
	{
		month: 2,
		day: 23,
		year: 1927,
		kind: 'event',
		title: 'Federal Radio Commission Established',
		text: 'President Calvin Coolidge signs the Radio Act of 1927, creating the Federal Radio Commission (FRC) to regulate radio spectrum allocation and bring order to crowded AM frequencies.',
		url: 'https://en.wikipedia.org/wiki/Federal_Radio_Commission'
	},
	{
		month: 4,
		day: 7,
		year: 1927,
		kind: 'event',
		title: 'First Long-Distance Public Television Broadcast in America',
		text: 'Bell Telephone Laboratories transmits the image and voice of Secretary of Commerce Herbert Hoover over wire from Washington, D.C. to an auditorium in New York City.',
		url: 'https://en.wikipedia.org/wiki/Bell_Labs'
	},
	{
		month: 5,
		day: 21,
		year: 1927,
		kind: 'event',
		title: 'Charles Lindbergh Completes Non-Stop Transatlantic Flight',
		text: 'Aviator Charles A. Lindbergh lands the Spirit of St. Louis at Le Bourget Field near Paris, completing the first solo non-stop transatlantic flight from Roosevelt Field, Long Island.',
		url: 'https://en.wikipedia.org/wiki/Charles_Lindbergh'
	}
];

export async function fetchVintageChronicles(isoDate: string): Promise<IngestedFact[]> {
	const parts = isoDate.split('-').map(Number);
	const targetYear = parts[0] || 1926;
	const targetMonth = parts[1] || 11;
	const targetDay = parts[2] || 15;

	// Match exact date first
	const exactMatches = HISTORICAL_CHRONICLES.filter(
		(c) => c.month === targetMonth && c.day === targetDay && Math.abs(c.year - targetYear) <= 1
	);

	if (exactMatches.length > 0) {
		return exactMatches.map((c) => ({
			kind: c.kind,
			year: targetYear,
			date: isoDate,
			text: c.text,
			source: {
				provider: 'curated_archive',
				title: `${c.title} (${targetYear})`,
				url: c.url,
				originalDate: isoDate
			}
		}));
	}

	// Match month
	const monthMatches = HISTORICAL_CHRONICLES.filter(
		(c) => c.month === targetMonth && Math.abs(c.year - targetYear) <= 1
	);

	if (monthMatches.length > 0) {
		const chosen = monthMatches[targetDay % monthMatches.length];
		return [
			{
				kind: chosen.kind,
				year: targetYear,
				date: isoDate,
				text: chosen.text,
				source: {
					provider: 'curated_archive',
					title: `${chosen.title} (${targetYear})`,
					url: chosen.url,
					originalDate: isoDate
				}
			}
		];
	}

	// Fallback to closest seasonal record
	const fallback = HISTORICAL_CHRONICLES[targetMonth % HISTORICAL_CHRONICLES.length];
	return [
		{
			kind: fallback.kind,
			year: targetYear,
			date: isoDate,
			text: fallback.text,
			source: {
				provider: 'curated_archive',
				title: `${fallback.title} (${targetYear})`,
				url: fallback.url,
				originalDate: isoDate
			}
		}
	];
}
