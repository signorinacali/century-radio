import type { IngestedFact } from './wikimedia';

interface PeriodDispatch {
	month: number;
	day?: number;
	year: number;
	category: 'politics' | 'aviation' | 'sports' | 'culture' | 'weather' | 'commerce';
	title: string;
	headline: string;
	narrativeContext: string;
	relatedEntities: string[];
	url: string;
}

const HISTORICAL_PERIOD_ARCHIVE: PeriodDispatch[] = [
	{
		month: 1,
		day: 26,
		year: 1926,
		category: 'aviation',
		title: 'John Logie Baird Demonstrates Mechanical Television in London',
		headline: 'Scottish inventor John Logie Baird gives the first public demonstration of a true television system transmission to members of the Royal Institution.',
		narrativeContext: 'Inside his cramped attic laboratory at 22 Frith Street in Soho, London, Baird utilized a Nipkow spinning disk with lenses to transmit live moving grayscale images of his office assistant William Taynton. The transmission was achieved at five frames per second with 30 lines of resolution. Observers from The Times reported seeing recognizable human features turning and moving across the flickering optical apparatus, marking the birth of electronic television broadcasting.',
		relatedEntities: ['John Logie Baird', 'Royal Institution', 'Nipkow Disk', 'Soho Laboratory'],
		url: 'https://en.wikipedia.org/wiki/John_Logie_Baird'
	},
	{
		month: 2,
		day: 12,
		year: 1926,
		category: 'culture',
		title: 'Langston Hughes Publishes The Weary Blues',
		headline: 'Poet Langston Hughes releases his landmark debut collection of Harlem Renaissance verse celebrating blues rhythms and Black urban life.',
		narrativeContext: 'Published by Alfred A. Knopf in New York, the collection draws on the syncopated rhythms of jazz and blues heard in Harlem cabarets and Seventh Avenue speakeasies. Critics herald the volume as a vital new voice in American literature, capturing the pulse of the Great Migration and the vitality of contemporary Harlem artistic expression.',
		relatedEntities: ['Langston Hughes', 'Harlem Renaissance', 'Alfred A. Knopf'],
		url: 'https://en.wikipedia.org/wiki/The_Weary_Blues'
	},
	{
		month: 3,
		day: 7,
		year: 1926,
		category: 'commerce',
		title: 'First Two-Way Transatlantic Radio-Telephone Circuit Established',
		headline: 'Engineers from AT&T, Western Electric, and the British General Post Office conduct the first successful two-way radiotelephone conversation between London and New York.',
		narrativeContext: 'Transmitting over high-power long-wave transmitters located at Rocky Point, Long Island, and receiving stations in Houlton, Maine, engineers exchanged clear vocal conversations with their counterparts in Rugby and Wroughton, England. The 3,500-mile wireless link demonstrated that commercial voice telephony across the Atlantic was technically viable, opening the path to daily commercial service across the Atlantic ocean.',
		relatedEntities: ['AT&T', 'Rocky Point Transmitter', 'British General Post Office', 'Radio Telephony'],
		url: 'https://en.wikipedia.org/wiki/Transatlantic_telephone_cable'
	},
	{
		month: 3,
		day: 16,
		year: 1926,
		category: 'aviation',
		title: 'Robert H. Goddard Launches Worlds First Liquid-Fueled Rocket',
		headline: 'Physicist Robert H. Goddard successfully launches the worlds first rocket powered by liquid propellants from a farm in Auburn, Massachusetts.',
		narrativeContext: 'Setting up his apparatus in an open cabbage field on his Aunt Effies farm, Dr. Goddard ignited a ten-foot steel frame using liquid oxygen and gasoline. The rocket burned for 2.5 seconds, climbed to an altitude of 41 feet, and landed 184 feet away in a snow-covered cabbage patch. Though modest in flight distance, the experiment proved that liquid-propellant rocketry could generate sufficient thrust to overcome gravitational inertia.',
		relatedEntities: ['Robert H. Goddard', 'Liquid Rocketry', 'Auburn Massachusetts'],
		url: 'https://en.wikipedia.org/wiki/Robert_H._Goddard'
	},
	{
		month: 5,
		day: 3,
		year: 1926,
		category: 'politics',
		title: 'General Strike Paralyzes Great Britain',
		headline: 'Over 1.7 million British transport, railway, dock, and printing workers strike in solidarity with coal miners facing wage reductions.',
		narrativeContext: 'Called by the Trades Union Congress to halt wage cuts and lengthened hours in the coal pits, the nationwide work stoppage shut down British railways, buses, and press. The British government invoked the Emergency Powers Act, mobilizing army regiments and university volunteers to distribute milk and operate skeleton transport services while BBC radio broadcasts became the primary source of news.',
		relatedEntities: ['Trades Union Congress', 'Stanley Baldwin', 'British General Strike'],
		url: 'https://en.wikipedia.org/wiki/1926_United_Kingdom_general_strike'
	},
	{
		month: 5,
		day: 9,
		year: 1926,
		category: 'aviation',
		title: 'Byrd and Bennett Report Transpolar Flight from Spitsbergen',
		headline: 'Lt. Cmdr. Richard E. Byrd and pilot Floyd Bennett return to King’s Bay, claiming the first aerial flight over the Geographic North Pole.',
		narrativeContext: 'Flying in the Fokker F.VIIa-3m trimotor christened Josephine Ford, the expedition departed from Svalbard under sub-zero Arctic conditions. After fifteen hours and forty-four minutes in the air navigating by sun compass and dead reckoning, the crew returned to cheering crowds. The exploit captured international headlines and prompted celebrations across the United States.',
		relatedEntities: ['Richard E. Byrd', 'Floyd Bennett', 'Fokker Trimotor', 'Spitsbergen'],
		url: 'https://en.wikipedia.org/wiki/Richard_E._Byrd'
	},
	{
		month: 5,
		day: 20,
		year: 1926,
		category: 'aviation',
		title: 'Air Commerce Act Signed into Law by President Coolidge',
		headline: 'Federal legislation establishes the Aeronautics Branch under the Department of Commerce, bringing safety regulation and airway lighting to commercial flight.',
		narrativeContext: 'Recognizing that aviation had outgrown unregulated barnstorming, the Act empowered Commerce Secretary Herbert Hoover to inspect aircraft, issue commercial pilot licenses, establish illuminated night airways with rotating radio beacons, and enforce air traffic rules. The measure laid the structural bedrock for modern airline passenger routes across North America.',
		relatedEntities: ['Calvin Coolidge', 'Herbert Hoover', 'Air Commerce Act'],
		url: 'https://en.wikipedia.org/wiki/Air_Commerce_Act'
	},
	{
		month: 6,
		day: 25,
		year: 1926,
		category: 'sports',
		title: 'Bobby Jones Triumphs at British Open Championship',
		headline: 'American amateur golfer Bobby Jones captures the Open Championship at Royal Lytham & St Annes with legendary shot from sandy scrub.',
		narrativeContext: 'During the final round, Jones found his ball nestled in heavy sand 175 yards from the 17th green with no clear line of sight. Using a mashie iron, he struck a clean shot that landed within eight feet of the cup. His score of 291 secured victory by two strokes, making him only the second amateur in modern golf history to claim the Claret Jug on British soil.',
		relatedEntities: ['Bobby Jones', 'Royal Lytham & St Annes', 'Open Championship'],
		url: 'https://en.wikipedia.org/wiki/Bobby_Jones_(golfer)'
	},
	{
		month: 8,
		day: 6,
		year: 1926,
		category: 'sports',
		title: 'Gertrude Ederle Becomes First Woman to Swim the English Channel',
		headline: 'Nineteen-year-old New Yorker Gertrude Ederle swims from Cap Gris-Nez to Kingsdown in fourteen hours and thirty-one minutes.',
		narrativeContext: 'Coated in petroleum jelly, lard, and olive oil to shield against frigid waters and jellyfish stings, Ederle swam using an eight-beat American crawl. Navigating turbulent cross-currents that stretched her course to thirty-five miles, she shattered the existing men’s world record by nearly two hours. Over two million cheering spectators lined Lower Broadway upon her ticker-tape return to Manhattan.',
		relatedEntities: ['Gertrude Ederle', 'English Channel', 'Manhattan Ticker Tape'],
		url: 'https://en.wikipedia.org/wiki/Gertrude_Ederle'
	},
	{
		month: 8,
		day: 6,
		year: 1926,
		category: 'culture',
		title: 'Warner Brothers Premieres Vitaphone Sound-on-Disc with Don Juan',
		headline: 'The Warner Theatre in New York debuts Don Juan starring John Barrymore, featuring synchronized sound effects and symphonic score recorded on Vitaphone wax discs.',
		narrativeContext: 'Developed by Western Electric and Bell Telephone Laboratories, the Vitaphone system locked a 33⅓ rpm 16-inch transcription disc to the theatrical motion picture projector. Preceded by short sound films of the New York Philharmonic and opera baritone Giovanni Martinelli, the screening electrified audiences and heralded the imminent transition away from silent cinema.',
		relatedEntities: ['Warner Bros', 'Vitaphone', 'John Barrymore', 'Western Electric'],
		url: 'https://en.wikipedia.org/wiki/Don_Juan_(1926_film)'
	},
	{
		month: 9,
		day: 18,
		year: 1926,
		category: 'weather',
		title: 'Great Miami Hurricane Devastates South Florida',
		headline: 'A catastrophic Category 4 hurricane strikes Miami and the Atlantic coast with 130 mph winds and an eleven-foot storm surge.',
		narrativeContext: 'The storm overwhelmed the newly developed coastal boomtowns of Miami Beach, Coral Gables, and Hollywood. When the eye passed directly over downtown Miami, many residents emerged believing the tempest had passed, only to be caught in the ferocious back half of the tempest. Over 370 lives were lost, thousands left homeless, and property damage halted the speculative Florida land boom.',
		relatedEntities: ['Miami Hurricane', 'Florida Land Boom', 'Red Cross Relief'],
		url: 'https://en.wikipedia.org/wiki/1926_Miami_hurricane'
	},
	{
		month: 9,
		day: 23,
		year: 1926,
		category: 'sports',
		title: 'Gene Tunney Dethrones Heavyweight Champion Jack Dempsey',
		headline: 'Before 120,757 spectators in Philadelphia, former Marine Gene Tunney wins a ten-round unanimous decision over the Manassa Mauler.',
		narrativeContext: 'Fighting in torrential rain at Sesquicentennial Stadium, Tunney employed superior footwork, crisp left jabs, and scientific defense to outpoint Dempsey, who had held the heavyweight crown for seven years. The gate receipts exceeded $1.89 million, breaking all previous sports box office records and confirming boxing as Americas premier mass spectacle.',
		relatedEntities: ['Gene Tunney', 'Jack Dempsey', 'Sesquicentennial Stadium'],
		url: 'https://en.wikipedia.org/wiki/Gene_Tunney'
	},
	{
		month: 9,
		day: 25,
		year: 1926,
		category: 'commerce',
		title: 'Henry Ford Institutes Five-Day Forty-Hour Work Week',
		headline: 'Ford Motor Company announces the universal adoption of an eight-hour, five-day work week without reducing worker compensation.',
		narrativeContext: 'Henry Ford argued that providing industrial laborers with two full weekend days of leisure would stimulate consumer spending on motor cars, radio sets, and travel. Over 100,000 Ford assembly workers in Dearborn and Highland Park shifted to the forty-hour schedule, setting a precedent that spread rapidly through the American manufacturing sector.',
		relatedEntities: ['Henry Ford', 'Ford Motor Company', 'Forty-Hour Week'],
		url: 'https://en.wikipedia.org/wiki/Henry_Ford'
	},
	{
		month: 10,
		day: 6,
		year: 1926,
		category: 'sports',
		title: 'Babe Ruth Blasts Three Home Runs in World Series Game Four',
		headline: 'Yankees slugger Babe Ruth sets a World Series record with three towering home runs at Sportsman’s Park in St. Louis.',
		narrativeContext: 'Facing the Cardinals pitching staff, Ruth drove one ball over the right field roof and another deep into center field beyond the flagpole. Prior to the game, Ruth had sent an autographed baseball to Johnny Sylvester, an ailing eleven-year-old boy in New Jersey, promising to hit a home run for him. His three home runs in a single fall classic contest established a benchmark in baseball history.',
		relatedEntities: ['Babe Ruth', 'New York Yankees', '1926 World Series', 'Johnny Sylvester'],
		url: 'https://en.wikipedia.org/wiki/1926_World_Series'
	},
	{
		month: 10,
		day: 22,
		year: 1926,
		category: 'culture',
		title: 'Ernest Hemingway Releases The Sun Also Rises',
		headline: 'Scribners publishes Ernest Hemingways debut novel encapsulating the disillusionment and vitality of the Lost Generation.',
		narrativeContext: 'Chronicling the expatriate circle of Jake Barnes and Lady Brett Ashley from the Parisian cafes of Montparnasse to the bullfighting arena in Pamplona, the novel cemented Hemingways spare, direct prose style. The book popularized Gertrude Steins phrase "You are all a lost generation" and defined post-war artistic sentiment in New York and Paris.',
		relatedEntities: ['Ernest Hemingway', 'The Sun Also Rises', 'Lost Generation', 'Charles Scribner'],
		url: 'https://en.wikipedia.org/wiki/The_Sun_Also_Rises'
	},
	{
		month: 11,
		day: 11,
		year: 1926,
		category: 'commerce',
		title: 'Federal Route 66 Officially Designated Linking Chicago to Los Angeles',
		headline: 'The American Association of State Highway Officials formalizes the 2,448-mile federal highway connecting Lake Michigan with the Pacific Ocean.',
		narrativeContext: 'Spearheaded by Oklahoma businessmen Cyrus Avery and John Woodruff, Route 66 was planned to link rural agrarian towns across Illinois, Missouri, Kansas, Oklahoma, Texas, New Mexico, Arizona, and California. Known colloquially as the Main Street of America, the road enabled fleets of trucks, mail couriers, and motorists to traverse the country on a single continuous overland route.',
		relatedEntities: ['U.S. Route 66', 'Cyrus Avery', 'Department of Agriculture'],
		url: 'https://en.wikipedia.org/wiki/U.S._Route_66'
	},
	{
		month: 11,
		day: 15,
		year: 1926,
		category: 'culture',
		title: 'NBC Inaugurates Nationwide Radio Broadcasting from the Waldorf-Astoria',
		headline: 'The National Broadcasting Company launches the first permanent coast-to-coast radio network with a four-hour gala concert in New York.',
		narrativeContext: 'Under the presidency of Merlin H. Aylesworth and sponsored by RCA, General Electric, and Westinghouse, NBC connected twenty-four stations across twenty-one cities via leased AT&T wire circuits. From the Grand Ballroom of the Waldorf-Astoria, an estimated five million listeners tuned in to hear Will Rogers broadcasting from Independence, Kansas, the New York Philharmonic Orchestra, and the comedy team of Weber and Fields.',
		relatedEntities: ['NBC', 'Waldorf-Astoria', 'Merlin H. Aylesworth', 'David Sarnoff', 'Will Rogers'],
		url: 'https://en.wikipedia.org/wiki/NBC'
	},
	{
		month: 12,
		day: 10,
		year: 1926,
		category: 'politics',
		title: 'Nobel Peace Prizes Awarded to Dawes, Chamberlain, and Briand',
		headline: 'The Nobel Committee honors architects of the Locarno Treaties and Dawes Plan for stabilizing post-war European diplomacy.',
		narrativeContext: 'Vice President Charles G. Dawes of the United States was recognized for authoring the 1924 fiscal restructuring plan that stabilized German currency reparations, while British Foreign Secretary Austen Chamberlain and French Foreign Minister Aristide Briand were recognized for negotiating mutual border guarantees at Locarno. The awards were celebrated as a triumph for collective international peace.',
		relatedEntities: ['Charles G. Dawes', 'Aristide Briand', 'Locarno Treaties', 'Nobel Peace Prize'],
		url: 'https://en.wikipedia.org/wiki/1926_Nobel_Peace_Prize'
	},
	{
		month: 1,
		day: 7,
		year: 1927,
		category: 'commerce',
		title: 'Commercial Transatlantic Telephone Service Opens to the Public',
		headline: 'Commercial radiotelephone service officially opens between New York and London at seventy-five dollars for three minutes.',
		narrativeContext: 'Walter S. Gifford, president of AT&T in New York, and Sir Evelyn Murray, secretary of the British General Post Office in London, opened the commercial circuit with formal transatlantic greetings. Over thirty-one commercial calls were placed on the first day, primarily between Wall Street investment banks and the London Stock Exchange, demonstrating instant voice communication over 3,000 miles of ocean.',
		relatedEntities: ['Walter S. Gifford', 'AT&T', 'London Stock Exchange', 'Transatlantic Telephone'],
		url: 'https://en.wikipedia.org/wiki/Transatlantic_telephone_cable'
	},
	{
		month: 2,
		day: 23,
		year: 1927,
		category: 'politics',
		title: 'Radio Act of 1927 Establishes the Federal Radio Commission',
		headline: 'President Coolidge signs landmark radio legislation establishing federal licensing to eliminate chaotic frequency interference.',
		narrativeContext: 'Following the breakdown of Commerce Department oversight after court challenges in 1926, the broadcast band had plunged into chaos as stations arbitrarily increased power and pirated wavelengths. The Radio Act established the five-member Federal Radio Commission (FRC), affirming that radio airwaves are public property and requiring broadcasters to operate in the public interest, convenience, or necessity.',
		relatedEntities: ['Federal Radio Commission', 'Calvin Coolidge', 'Radio Act of 1927'],
		url: 'https://en.wikipedia.org/wiki/Federal_Radio_Commission'
	},
	{
		month: 4,
		day: 7,
		year: 1927,
		category: 'aviation',
		title: 'Herbert Hoover Appears in First Long-Distance Television Demonstration',
		headline: 'Bell Telephone Laboratories transmits Commerce Secretary Herbert Hoovers live image and speech from Washington to New York.',
		narrativeContext: 'Seated at a microphone in Washington, D.C., Secretary Hoover delivered an address while a specialized scanning apparatus illuminated his face. Over two hundred miles away in an auditorium at 463 West Street in Manhattan, Bell Labs engineers projected Hoovers moving image onto a two-by-three-foot neon glow screen accompanied by synchronized sound over wire circuits.',
		relatedEntities: ['Herbert Hoover', 'Bell Telephone Laboratories', 'West Street Manhattan'],
		url: 'https://en.wikipedia.org/wiki/Bell_Labs'
	},
	{
		month: 5,
		day: 21,
		year: 1927,
		category: 'aviation',
		title: 'Charles Lindbergh Completes Epic Solo Nonstop Flight to Paris',
		headline: 'Twenty-five-year-old aviator Charles A. Lindbergh lands the Spirit of St. Louis at Le Bourget Field after thirty-three and a half hours over the Atlantic.',
		narrativeContext: 'Departing from muddy Roosevelt Field on Long Island without radio, copilot, or forward windshield view, Lindbergh guided his custom Ryan monoplane through fog, sleet, and sleep deprivation. Touching down at Le Bourget at 10:22 PM local time, his plane was mobbed by an estimated 150,000 spectators, cementing his status as the greatest aviation hero of the century.',
		relatedEntities: ['Charles Lindbergh', 'Spirit of St. Louis', 'Le Bourget', 'Orteig Prize'],
		url: 'https://en.wikipedia.org/wiki/Charles_Lindbergh'
	}
];

export async function fetchPeriodContext(isoDate: string): Promise<IngestedFact[]> {
	const parts = isoDate.split('-').map(Number);
	const targetYear = parts[0] || 1926;
	const targetMonth = parts[1] || 11;
	const targetDay = parts[2] || 15;

	const facts: IngestedFact[] = [];

	// 1. Exact Day Matches (or within 1-2 days)
	const exactMatches = HISTORICAL_PERIOD_ARCHIVE.filter(
		(d) =>
			d.month === targetMonth &&
			d.day !== undefined &&
			Math.abs(d.day - targetDay) <= 2 &&
			Math.abs(d.year - targetYear) <= 1
	);

	for (const match of exactMatches) {
		facts.push({
			kind: 'event',
			year: targetYear,
			date: isoDate,
			text: `${match.headline} ${match.narrativeContext}`,
			source: {
				provider: 'curated_archive',
				title: `${match.title} (${targetYear})`,
				url: match.url,
				originalDate: isoDate
			},
			detailedContext: match.narrativeContext,
			category: match.category,
			relatedEntities: match.relatedEntities
		});
	}

	// 2. Month-specific background chronicles
	const monthMatches = HISTORICAL_PERIOD_ARCHIVE.filter(
		(d) => d.month === targetMonth && Math.abs(d.year - targetYear) <= 1
	);

	// Select 2-3 dispatches from the month to ensure richness
	const additionalCount = Math.max(0, 3 - facts.length);
	for (let i = 0; i < additionalCount && i < monthMatches.length; i++) {
		const match = monthMatches[(targetDay + i) % monthMatches.length];
		if (!facts.some((f) => f.source.title.startsWith(match.title))) {
			facts.push({
				kind: 'event',
				year: targetYear,
				date: isoDate,
				text: `${match.headline} ${match.narrativeContext}`,
				source: {
					provider: 'curated_archive',
					title: `${match.title} (${targetYear})`,
					url: match.url,
					originalDate: isoDate
				},
				detailedContext: match.narrativeContext,
				category: match.category,
				relatedEntities: match.relatedEntities
			});
		}
	}

	// 3. Fallback to rich historical anchors if still sparse
	if (facts.length < 2) {
		for (let i = 0; i < 2; i++) {
			const fallback = HISTORICAL_PERIOD_ARCHIVE[(targetMonth + i) % HISTORICAL_PERIOD_ARCHIVE.length];
			facts.push({
				kind: 'event',
				year: targetYear,
				date: isoDate,
				text: `${fallback.headline} ${fallback.narrativeContext}`,
				source: {
					provider: 'curated_archive',
					title: `${fallback.title} (${targetYear})`,
					url: fallback.url,
					originalDate: isoDate
				},
				detailedContext: fallback.narrativeContext,
				category: fallback.category,
				relatedEntities: fallback.relatedEntities
			});
		}
	}

	return facts;
}
