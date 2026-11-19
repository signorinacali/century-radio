import type { BroadcastDay } from '$lib/types/broadcast';

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

export function createSampleBroadcastDay(targetDate = '1926-11-15'): BroadcastDay {
	const longDate = formatCenturyDateLong(targetDate);

	return {
		schemaVersion: 2,
		id: targetDate,
		stationCallsign: 'WCRN-AM',
		stationLocation: 'New York, NY',
		targetFrequencyKHz: 710,
		totalDurationSec: 1080,
		generatedAt: `${targetDate}T20:00:00Z`,
		segments: [
			{
				id: 'seg-01-id',
				order: 1,
				type: 'STATION_ID',
				title: 'WCRN Evening Sign-On & Program Rundown',
				scheduledOffsetSec: 0,
				durationSec: 45,
				moodTags: ['fireside'],
				topicTags: ['culture'],
				scriptText:
					`Good evening, ladies and gentlemen. This is station WCRN, operating by authority of the Federal Department of Commerce on a clear-channel frequency of 710 kilocycles, corresponding to a wavelength of 422.3 meters in the American broadcast band.\n\nFrom our studios atop the Manhattan skyline, we welcome listeners across the Atlantic Seaboard and inland states to our comprehensive evening broadcast for ${longDate}.\n\nStand by for our lead international and national wire bulletins, followed by a special correspondent inquiry into the day’s developments, authentic recordings from the studio Victrola, our Wall Street and Curb ticker report, aeronautical dispatches, and our regional maritime weather summary.`,
				audio: {
					sourceType: 'synthesized',
					url: 'synth://station-id',
					format: 'audio/webaudio',
					durationSec: 45
				},
				sources: [
					{
						provider: 'curated_archive',
						title: '1926 Department of Commerce Radio Callsign Registry',
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-02-news-nbc',
				order: 2,
				type: 'NEWS_BULLETIN',
				title: 'AP Wire: National Broadcasting Company Inaugurates Coast-to-Coast Network',
				scheduledOffsetSec: 45,
				durationSec: 95,
				moodTags: ['urgent', 'upbeat'],
				topicTags: ['culture', 'commerce'],
				scriptText:
					'Flash from the Associated Press wire — Tonight marks an unprecedented epoch in American wireless communication! The National Broadcasting Company has formally inaugurated its permanent coast-to-coast network with a grand gala concert originating from the Grand Ballroom of the Waldorf-Astoria Hotel in New York City.\n\nUnder the direction of David Sarnoff and network president Merlin Aylesworth, twenty-four premier broadcast stations stretching from Boston and New York across the Alleghenies to Kansas City and Chicago were linked through thousands of miles of special telephone trunk lines furnished by the American Telephone and Telegraph Company.\n\nAn estimated five million listeners across farms, villages, and great cities tuned their receivers simultaneously to hear the New York Symphony Orchestra conducted by Walter Damrosch, followed by remote comedy commentary from Will Rogers speaking into a microphone in Independence, Kansas. Observers in Washington declare this the definitive unification of the American ether.',
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
				scheduledOffsetSec: 140,
				durationSec: 85,
				moodTags: ['fireside', 'solemn'],
				topicTags: ['culture', 'commerce'],
				scriptText:
					'Let us pause to examine the profound human drama unfolding across our republic this evening.\n\nOnly five years ago, the radio receiver was the exclusive toy of electrical experimenters, requiring clumsy earphones, crystal detectors, and tangled aerial wires strewn across roofs and tree limbs. Today, fine cabinet super-heterodynes with electrodynamic cone speakers have taken pride of place beside the piano in millions of parlors.\n\nThe isolation of the rural farmstead has vanished into thin air. A farmer in Iowa or a lighthouse keeper off the Maine coast now listens to the identical market prices, classical arias, and presidential addresses at the exact instant they reach the ears of Manhattan financiers. In this shared listening experience, a new national consciousness is taking shape.',
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
				title: '78rpm Interlude: Whispering — Paul Whiteman & His Ambassador Orchestra',
				scheduledOffsetSec: 225,
				durationSec: 180,
				moodTags: ['fireside', 'upbeat'],
				topicTags: ['culture'],
				scriptText:
					'[Studio Victrola Interlude] We lower our microphones for a brief musical selection spinning on the studio phonograph — Paul Whiteman and his Ambassador Orchestra playing their celebrated Victor recording of "Whispering".',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://music-78',
					format: 'audio/webaudio',
					durationSec: 180
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'Great 78 Project: Whispering (Paul Whiteman)',
						originalDate: '1920'
					}
				]
			},
			{
				id: 'seg-05-market-closing',
				order: 5,
				type: 'MARKET_REPORT',
				title: 'Wall Street & Curb Exchange Official Closing Ticker',
				scheduledOffsetSec: 405,
				durationSec: 75,
				moodTags: ['upbeat'],
				topicTags: ['commerce'],
				scriptText:
					'Turning now to our financial desk — The closing gong has sounded across the floor of the New York Stock Exchange, concluding a session marked by steady investment accumulation.\n\nCall money renewed at four and one-half percent, with ample funds offered by downtown institutions. United States Steel was the active market leader, advancing one and three-eighths points to close at one hundred forty-six and one-eighth. Radio Corporation of America displayed sharp buoyancy, crossing sixty-one on expectations of record holiday receiver sales.\n\nOver on the New York Curb Exchange, public utility securities met with aggressive buying, while copper issues held firm on export shipments to European smelters. At Chicago, wheat futures traded in a narrow range, closing three-quarters of a cent lower at one dollar thirty-seven and a half.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://market-report',
					format: 'audio/webaudio',
					durationSec: 75
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'New York Financial Chronicle & Ticker Tape (1926)',
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-06-news-route66',
				order: 6,
				type: 'NEWS_BULLETIN',
				title: 'National Wire: Federal Route 66 Formally Designated',
				scheduledOffsetSec: 480,
				durationSec: 80,
				moodTags: ['upbeat'],
				topicTags: ['politics', 'aviation'],
				scriptText:
					'From the federal capital at Washington — The American Association of State Highway Officials has given formal ratification to the numbering of U.S. Route 66, establishing a continuous two-thousand-four-hundred-mile overland artery connecting Lake Michigan with the Pacific.\n\nHighway commissioners report that the designated route spans Illinois, Missouri, Kansas, Oklahoma, Texas, New Mexico, Arizona, and California. Motorists embarking upon the transcontinental journey are advised that extensive gravel and graded dirt sections persist throughout the Southwest, though paving gangs are operating double shifts near Tulsa and Albuquerque.\n\nMotor freight syndicates hail the measure as a major milestone for interstate commerce, permitting heavy cargo trucks to traverse the continent year-round.',
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
				scheduledOffsetSec: 560,
				durationSec: 80,
				moodTags: ['upbeat'],
				topicTags: ['aviation', 'commerce'],
				scriptText:
					'From our bureau of aeronautical progress — The Aeronautics Branch of the Department of Commerce reports that the transcontinental lighted airway is now operating at peak efficiency between New York and Salt Lake City.\n\nPilots flying the night mail in Liberty-powered de Havilland biplanes are guided across the nocturnal wilderness by three-million-candlepower rotating electric beacons mounted on fifty-foot steel towers spaced every ten miles. Emergency landing fields illuminated by red and green boundary lamps stand ready at thirty-mile intervals.\n\nPostal officials announce that airmail delivery times have fallen below thirty hours from coast to coast, enabling commercial paper and urgent bank drafts to clear between Manhattan and California three days faster than the fastest express trains.',
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
				id: 'seg-08-sports-broadway',
				order: 8,
				type: 'SPORTS_ROUNDUP',
				title: 'Sports Desk & Broadway Stage: Ruth, Tunney, and Theatrical Lights',
				scheduledOffsetSec: 640,
				durationSec: 85,
				moodTags: ['upbeat', 'jazz'],
				topicTags: ['sports', 'culture'],
				scriptText:
					'Turning now to our sporting summary and the theatrical pulse of Manhattan — Sportsmen across the continent continue to marvel at the triumphs of the autumn campaign.\n\nBaseball circles are still buzzing following the dramatic conclusion of the World Series, where Babe Ruth electrified spectators by clouting three home runs in a single contest at St. Louis. Meanwhile, in heavyweight boxing circles, promoters are already negotiating terms for a return bout between newly crowned champion Gene Tunney and former titleholder Jack Dempsey, following their record-shattering clash before one hundred twenty thousand fans in Philadelphia.\n\nAlong Broadway, theater box offices report extraordinary demand for tickets. The Ziegfeld revues and George Gershwin’s lively musical melodies are packing houses nightly, while down in Greenwich Village, experimental theatrical troupes are drawing discriminating patrons from across the borough.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://sports-roundup',
					format: 'audio/webaudio',
					durationSec: 85
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'New York Herald Tribune Sports & Stage Review (1926)',
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-09-music-ballroom',
				order: 9,
				type: 'MUSIC_INTERLUDE',
				title: '78rpm Interlude: Black Bottom Stomp — Jelly Roll Morton’s Red Hot Peppers',
				scheduledOffsetSec: 725,
				durationSec: 180,
				moodTags: ['jazz', 'upbeat'],
				topicTags: ['culture'],
				scriptText:
					'[Studio Victrola Interlude] The turntable spins once more for our evening listeners — Jelly Roll Morton’s Red Hot Peppers playing "Black Bottom Stomp", recorded on the Victor label.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://music-78',
					format: 'audio/webaudio',
					durationSec: 180
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'Victor Talking Machine Co. Matrix BVE-36239 (1926)',
						originalDate: '1926'
					}
				]
			},
			{
				id: 'seg-10-ad-radiola',
				order: 10,
				type: 'VINTAGE_AD',
				title: 'Sponsor Message: RCA Radiola 20 Super-Heterodyne Receiver',
				scheduledOffsetSec: 905,
				durationSec: 55,
				moodTags: ['fireside'],
				topicTags: ['commerce'],
				scriptText:
					'A word from our sponsor — Bring the concert hall, the church pulpit, and the boxing ring directly into your living room with the new RCA Radiola 20.\n\nHoused in a hand-rubbed two-tone mahogany cabinet that graces the finest furniture suite, the Radiola 20 combines five Radiotron vacuum tubes with advanced tuned radio frequency amplification. Its vernier single-dial control allows you to separate crowded broadcast stations with razor-sharp selectivity, banishing squeals and interference.\n\nPriced at only one hundred fifteen dollars, complete with tubes. Easy payment terms are readily available from your authorized Victor or RCA dealer. Visit your neighborhood merchant tomorrow morning and discover radio entertainment at its supreme perfection!',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://vintage-ad',
					format: 'audio/webaudio',
					durationSec: 55
				},
				sources: [
					{
						provider: 'chronicling_america',
						title: '1926 Radiola Newspaper Display Advertisement',
						originalDate: '1926-11'
					}
				]
			},
			{
				id: 'seg-11-weather',
				order: 11,
				type: 'WEATHER_REPORT',
				title: 'U.S. Weather Bureau Atlantic Seaboard & Maritime Forecast',
				scheduledOffsetSec: 960,
				durationSec: 60,
				moodTags: ['solemn', 'fireside'],
				topicTags: ['weather'],
				scriptText:
					'Here is the official bulletin prepared by the United States Weather Bureau for New York City, Long Island, and Atlantic shipping interests.\n\nA barometric high centered over the Great Lakes is advancing eastward, accompanied by unseasonably crisp temperatures and light northwesterly breezes. Tonight: Fair and colder, with the thermometer descending to thirty-two degrees in suburban areas and frost expected on exposed vegetation by daybreak. Tomorrow: Bright sunshine throughout the day with highest temperature near forty-six degrees.\n\nFor coastwise shipping between Boston Light and the Virginia Capes: Moderate northwest winds of twelve to eighteen knots, smooth to moderate sea, visibility seven miles. No storm warnings are displayed.',
				audio: {
					sourceType: 'synthesized',
					url: 'synth://weather',
					format: 'audio/webaudio',
					durationSec: 60
				},
				sources: [
					{
						provider: 'chronicling_america',
						title: 'U.S. Weather Bureau Daily Bulletin — Nov 1926',
						originalDate: targetDate
					}
				]
			},
			{
				id: 'seg-12-editorial-signoff',
				order: 12,
				type: 'FIRESIDE_EDITORIAL',
				title: 'Evening Editorial: The Miraculous Century of Progress',
				scheduledOffsetSec: 1020,
				durationSec: 60,
				moodTags: ['fireside', 'solemn'],
				topicTags: ['culture'],
				scriptText:
					`As the glowing vacuum tubes illuminate our evening parlors and the hour grows late, we pause to ponder the swift march of human achievement on this ${longDate}.\n\nIn our modern century, electric dynamos, flying machines, and wireless ether waves have broken down the ancient barriers of silence and distance. Families gathered by their hearths are no longer solitary spectators; we are united in the shared heartbeat of a vast and vibrant nation.\n\nOn behalf of station WCRN and our engineering staff, we thank you for welcoming our broadcast into your home this evening. Until tomorrow at seven hundred ten kilocycles, this is your announcer wishing you peaceful thoughts, tranquil hours, and a very pleasant good night.`,
				audio: {
					sourceType: 'synthesized',
					url: 'synth://fireside-editorial',
					format: 'audio/webaudio',
					durationSec: 60
				},
				sources: [
					{
						provider: 'curated_archive',
						title: 'WCRN Historical Archive: Mid-Atlantic Broadcast Sign-off',
						originalDate: targetDate
					}
				]
			}
		]
	};
}
