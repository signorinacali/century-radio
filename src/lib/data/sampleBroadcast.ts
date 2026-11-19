import type { BroadcastDay, NewspaperClipping, StationId } from '$lib/types/broadcast';

export function computeCenturyDate(dayOffset = 0, yearOffset = 100, baseDate = new Date()): string {
	const d = new Date(baseDate);
	d.setDate(d.getDate() + dayOffset);
	const targetYear = d.getFullYear() - yearOffset;
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${targetYear}-${month}-${day}`;
}

export function formatCenturyDateLong(isoDate: string): string {
	const [y, m, d] = isoDate.split('-').map(Number);
	const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

export function createSampleBroadcastDay(
	targetDate = '1926-11-15',
	stationId: StationId = 'wcrn'
): BroadcastDay {
	const longDate = formatCenturyDateLong(targetDate);
	const isWgn = stationId === 'wgn';
	const callsign = isWgn ? 'WGN-MIDWEST' : 'WCRN-AM';
	const location = isWgn ? 'Chicago, IL' : 'New York, NY';
	const freq = isWgn ? 870 : 710;
	const wavelength = isWgn ? 344.6 : 422.3;

	const clippings: NewspaperClipping[] = [
		{
			id: 'sample-clip-1',
			masthead: 'The New York Times Wire',
			headline: 'NBC Inaugurates Coast-to-Coast Broadcast Network',
			date: '1926-11-15',
			summary:
				'Twenty-four stations from New York to Kansas City united by leased AT&T circuits from the Grand Ballroom of the Waldorf-Astoria.',
			category: 'culture',
			url: 'https://en.wikipedia.org/wiki/NBC',
			provider: 'wikipedia'
		},
		{
			id: 'sample-clip-2',
			masthead: 'Federal Highway Chronicle',
			headline: 'U.S. Route 66 Designated from Chicago to California',
			date: '1926-11-11',
			summary:
				'State highway officials ratify the 2,448-mile overland artery connecting Lake Michigan with the Pacific coast.',
			category: 'commerce',
			url: 'https://en.wikipedia.org/wiki/U.S._Route_66',
			provider: 'wikipedia'
		}
	];

	return {
		schemaVersion: 3,
		id: targetDate,
		stationId,
		stationCallsign: callsign,
		stationLocation: location,
		targetFrequencyKHz: freq,
		wavelengthMeters: wavelength,
		totalDurationSec: 1080,
		morseDispatch: `CQ CQ DE WCC CHATHAM MASS WIRE RELAY ${targetDate} = TO ${callsign} ${location.toUpperCase()} = NBC INAUGURATES COAST TO COAST NETWORK = ROUTE 66 DESIGNATED = AR K`,
		clippings,
		generatedAt: `${targetDate}T20:00:00Z`,
		segments: [
			{
				id: 'seg-01-id',
				order: 1,
				type: 'STATION_ID',
				title: `${callsign} Evening Sign-On & Program Rundown`,
				showName: 'Station Sign-On',
				speakerRole: 'Arthur Pendelton · Senior Newsman',
				scheduledOffsetSec: 0,
				durationSec: 45,
				moodTags: ['fireside'],
				topicTags: ['culture'],
				scriptText: `Good evening, ladies and gentlemen. This is station ${callsign}, operating by authority of the Federal Department of Commerce on a clear-channel frequency of ${freq} kilocycles, corresponding to a wavelength of ${wavelength} meters.\n\nFrom our studios in ${location}, we welcome listeners to our continuous broadcast for ${longDate}.\n\nStand by for our lead international and national wire bulletins, authentic Great Seventy-Eight Victrola recordings, market reports, radio theatre, and our evening Weather Bureau forecast.`,
				audio: {
					sourceType: 'synthesized',
					url: 'synth://station-id',
					format: 'audio/webaudio',
					durationSec: 45
				},
				sources: [
					{
						provider: 'curated_archive',
						title: `Department of Commerce ${freq} kHz Callsign Registry`,
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-02-news-nbc',
				order: 2,
				type: 'NEWS_BULLETIN',
				title: 'AP Wire: National Broadcasting Company Inaugurates Coast-to-Coast Network',
				showName: 'Evening AP Wire Desk',
				speakerRole: 'Arthur Pendelton · Senior Newsman',
				scheduledOffsetSec: 45,
				durationSec: 95,
				moodTags: ['urgent', 'upbeat'],
				topicTags: ['culture', 'commerce'],
				scriptText:
					'Flash from the Associated Press wire — Tonight marks an unprecedented epoch in American wireless communication! The National Broadcasting Company has formally inaugurated its permanent coast-to-coast network with a grand gala concert originating from the Grand Ballroom of the Waldorf-Astoria Hotel in New York City.\n\nUnder the direction of David Sarnoff and network president Merlin Aylesworth, twenty-four premier broadcast stations stretching from Boston and New York across the Alleghenies to Kansas City and Chicago were linked through thousands of miles of special telephone trunk lines furnished by the American Telephone and Telegraph Company.\n\nAn estimated five million listeners across farms, villages, and great cities tuned their receivers simultaneously to hear the New York Symphony Orchestra conducted by Walter Damrosch, followed by remote comedy commentary from Will Rogers speaking into a microphone in Independence, Kansas.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://news-bulletin',
					format: 'audio/webaudio',
					durationSec: 95
				},
				sources: [
					{
						provider: 'wikipedia',
						title: 'NBC Inaugural Broadcast — November 15, 1926',
						url: 'https://en.wikipedia.org/wiki/NBC',
						originalDate: '1926-11-15'
					}
				]
			},
			{
				id: 'seg-03-feature-radio-era',
				order: 3,
				type: 'FEATURE_STORY',
				title: 'Special Correspondent: The Revolution of the American Hearth',
				showName: 'Special Correspondent Desk',
				speakerRole: 'Arthur Pendelton · Special Correspondent',
				scheduledOffsetSec: 140,
				durationSec: 85,
				moodTags: ['fireside', 'solemn'],
				topicTags: ['culture', 'commerce'],
				scriptText:
					'Let us pause to examine the profound human drama unfolding across our republic this evening.\n\nOnly five years ago, the radio receiver was the exclusive toy of electrical experimenters, requiring clumsy earphones, crystal detectors, and tangled aerial wires strewn across roofs and tree limbs. Today, fine cabinet super-heterodynes with electrodynamic cone speakers have taken pride of place beside the piano in millions of parlors.\n\nThe isolation of the rural farmstead has vanished into thin air. A farmer in Iowa or a lighthouse keeper off the Maine coast now listens to the identical market prices, classical arias, and presidential addresses at the exact instant they reach the ears of Manhattan financiers.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://feature-story',
					format: 'audio/webaudio',
					durationSec: 85
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'Harper’s Magazine: Radio and the Modern Mind (1926)',
						originalDate: '1926-11'
					}
				]
			},
			{
				id: 'seg-04-music-ragtime',
				order: 4,
				type: 'MUSIC_INTERLUDE',
				title: "78rpm Interlude: I Ain't Never Had Nobody Crazy Over Me — Durante (1923)",
				showName: 'Early Evening Ballroom Showcase',
				speakerRole: 'Arthur Pendelton · Studio Victrola',
				scheduledOffsetSec: 225,
				durationSec: 180,
				moodTags: ['fireside', 'upbeat'],
				topicTags: ['culture'],
				introText:
					"We pause the telegraph wire for an authentic selection spinning on our studio Victrola — Jimmy Durante and The Broadway Syncopaters performing I Ain't Never Had Nobody Crazy Over Me, recorded in 1923.",
				scriptText:
					"We pause the telegraph wire for an authentic selection spinning on our studio Victrola — Jimmy Durante and The Broadway Syncopaters performing I Ain't Never Had Nobody Crazy Over Me, recorded in 1923.",
				audio: {
					sourceType: 'synthesized',
					url: 'synth://music-78',
					format: 'audio/webaudio',
					durationSec: 180
				},
				sources: [
					{
						provider: 'internet_archive',
						title: "Great 78 Project: I Ain't Never Had Nobody Crazy Over Me (1923)",
						url: 'https://archive.org/details/78_i-aint-never-had-nobody-crazy-over-me_durante-stein-roth-the-broadway-syncopaters_gbia0000427a',
						originalDate: '1923'
					}
				]
			},
			{
				id: 'seg-05-market-closing',
				order: 5,
				type: 'MARKET_REPORT',
				title: isWgn
					? 'Chicago Board of Trade & LaSalle St. Closing Ticker'
					: 'Wall Street & Curb Exchange Official Closing Ticker',
				showName: isWgn ? 'LaSalle St. Grain & Stock Desk' : 'Wall Street Closing Bell',
				speakerRole: 'Grant Sterling · Financial Ticker',
				scheduledOffsetSec: 405,
				durationSec: 75,
				moodTags: ['upbeat'],
				topicTags: ['commerce'],
				scriptText: isWgn
					? 'From the LaSalle Street financial desk — The closing bell has rung across the Chicago Board of Trade. December wheat settled at one dollar thirty-seven cents a bushel while Montgomery Ward and Sears Roebuck attracted vigorous institutional buying.'
					: 'Turning now to our financial desk — The closing gong has sounded across the floor of the New York Stock Exchange. Call money renewed at four and one-half percent, while United States Steel, General Electric, and Radio Corporation of America paced the advance.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://market-report',
					format: 'audio/webaudio',
					durationSec: 75
				},
				sources: [
					{
						provider: 'curated_archive',
						title: isWgn ? 'Chicago Board of Trade Quotations (1926)' : 'New York Financial Chronicle (1926)',
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-06-news-route66',
				order: 6,
				type: 'NEWS_BULLETIN',
				title: 'National Wire: Federal Route 66 Formally Designated',
				showName: 'Late Edition Wire Room',
				speakerRole: 'Arthur Pendelton · Senior Newsman',
				scheduledOffsetSec: 480,
				durationSec: 80,
				moodTags: ['upbeat'],
				topicTags: ['politics', 'aviation'],
				scriptText:
					'From the federal capital at Washington — The American Association of State Highway Officials has given formal ratification to the numbering of U.S. Route 66, establishing a continuous two-thousand-four-hundred-mile overland artery connecting Lake Michigan with the Pacific.\n\nHighway commissioners report that the designated route spans Illinois, Missouri, Kansas, Oklahoma, Texas, New Mexico, Arizona, and California.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://news-bulletin',
					format: 'audio/webaudio',
					durationSec: 80
				},
				sources: [
					{
						provider: 'wikipedia',
						title: 'U.S. Route 66 Formally Numbered (November 1926)',
						url: 'https://en.wikipedia.org/wiki/U.S._Route_66',
						originalDate: '1926-11-11'
					}
				]
			},
			{
				id: 'seg-07-science-airmail',
				order: 7,
				type: 'SCIENCE_AND_AVIATION',
				title: 'Modern Marvels: Transcontinental Airmail & Night Beacons',
				showName: 'Modern Marvels Report',
				speakerRole: 'Evelyn Shaw · Science & Air Desk',
				scheduledOffsetSec: 560,
				durationSec: 80,
				moodTags: ['upbeat'],
				topicTags: ['aviation', 'commerce'],
				scriptText:
					'From our bureau of aeronautical progress — The Aeronautics Branch of the Department of Commerce reports that the transcontinental lighted airway is now operating at peak efficiency between New York and Salt Lake City, cutting coast-to-coast airmail delivery below thirty hours.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://science-aviation',
					format: 'audio/webaudio',
					durationSec: 80
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'Department of Commerce Airway Bulletin No. 12',
						originalDate: '1926-11'
					}
				]
			},
			{
				id: 'seg-08-ad-radiola',
				order: 8,
				type: 'VINTAGE_AD',
				title: 'Sponsor Message: RCA Radiola 20 Super-Heterodyne Receiver',
				showName: 'RCA Commercial Feature',
				speakerRole: 'Clara Vance · Commercial Desk',
				scheduledOffsetSec: 640,
				durationSec: 55,
				moodTags: ['fireside'],
				topicTags: ['commerce'],
				scriptText:
					'A word from our sponsor — Bring the concert hall directly into your living room with the new five-tube RCA Radiola 20 in solid two-tone mahogany cabinetwork, priced at one hundred fifteen dollars complete with Radiotron tubes.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://vintage-ad',
					format: 'audio/webaudio',
					durationSec: 55
				},
				sources: [
					{
						provider: 'curated_archive',
						title: '1926 Radiola Display Copy',
						originalDate: '1926-11'
					}
				]
			},
			{
				id: 'seg-09-weather',
				order: 9,
				type: 'WEATHER_REPORT',
				title: isWgn
					? 'U.S. Weather Bureau Great Lakes Forecast'
					: 'U.S. Weather Bureau Atlantic Seaboard Forecast',
				showName: 'U.S. Weather Bureau',
				speakerRole: 'Evelyn Shaw · Weather Bureau',
				scheduledOffsetSec: 695,
				durationSec: 60,
				moodTags: ['solemn', 'fireside'],
				topicTags: ['weather'],
				scriptText: isWgn
					? `Official forecast from the Chicago Weather Bureau for ${longDate}: Clear and brisk across Lake Michigan and northern Illinois, low near thirty-four degrees tonight, moderate northwest breezes across lake shipping lanes.`
					: `Official forecast from the New York Weather Bureau for ${longDate}: Fair and crisp along the Atlantic Seaboard, thermometer near thirty-six degrees tonight, moderate northwest winds offshore.`,
				audio: {
					sourceType: 'synthesized',
					url: 'synth://weather',
					format: 'audio/webaudio',
					durationSec: 60
				},
				sources: [
					{
						provider: 'curated_archive',
						title: `U.S. Weather Bureau Daily Bulletin (${location})`,
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-10-editorial-signoff',
				order: 10,
				type: 'FIRESIDE_EDITORIAL',
				title: `Evening Editorial & ${callsign} Sign-Off`,
				showName: 'Fireside Reflections',
				speakerRole: 'Arthur Pendelton · Evening Editorial',
				scheduledOffsetSec: 755,
				durationSec: 60,
				moodTags: ['fireside', 'solemn'],
				topicTags: ['culture'],
				scriptText: `As the glowing vacuum tubes illuminate our evening parlors on ${longDate}, ${callsign} thanks you for welcoming our continuous broadcast into your home. Good night, and pleasant dreams.`,
				audio: {
					sourceType: 'synthesized',
					url: 'synth://fireside-editorial',
					format: 'audio/webaudio',
					durationSec: 60
				},
				sources: [
					{
						provider: 'curated_archive',
						title: `${callsign} Historical Sign-off Archive`,
						originalDate: targetDate
					}
				]
			}
		]
	};
}
