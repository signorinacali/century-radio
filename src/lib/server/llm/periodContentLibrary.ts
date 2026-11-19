import { formatCenturyDateLong } from '$lib/data/sampleBroadcast';
import type { IngestedFact } from '$lib/server/history/wikimedia';
import type { StationId } from '$lib/types/broadcast';

export interface VintageAdCopy {
	id: string;
	sponsor: string;
	title: string;
	region: 'national' | 'midwest';
	scriptText: string;
	sourceTitle: string;
}

const VINTAGE_ADS: VintageAdCopy[] = [
	{
		id: 'ad-radiola-20',
		sponsor: 'Radio Corporation of America',
		title: 'Sponsor Message: RCA Radiola 20 Super-Heterodyne',
		region: 'national',
		sourceTitle: 'RCA Radiola 20 Display Copy (1926)',
		scriptText:
			'A message from our esteemed sponsor — Bring the living artists, brass bands, and great symphony halls directly into your evening parlor with the new five-tube RCA Radiola 20.\n\nCrafted in solid two-tone mahogany cabinetwork, the Radiola 20 offers effortless single-dial vernier tuning, allowing you to separate distant carriers without whistle or interference. Hear the violin whisper and the orator speak as clearly as though you sat in the center box of Carnegie Hall.\n\nPriced at one hundred fifteen dollars, complete with five Radiotron vacuum tubes. Convenient monthly terms are available through your authorized Victor or RCA merchant tomorrow morning.'
	},
	{
		id: 'ad-orthophonic-victrola',
		sponsor: 'Victor Talking Machine Company',
		title: 'Sponsor Message: The New Orthophonic Victrola',
		region: 'national',
		sourceTitle: 'Victor Talking Machine Co. Credenza Catalog',
		scriptText:
			'Our evening concert is presented with the compliments of the Victor Talking Machine Company of Camden, New Jersey — introducing the revolutionary Orthophonic Victrola.\n\nEngineered upon the scientific principle of matched impedance, its folded exponential horn reproduces the full depth of the bass viol and the crisp shimmer of the trumpet without metallic rasping. Old-style phonographs are silent beside the lifelike realism of electrical Victor recordings.\n\nModels range from the compact Consolette at eighty-five dollars to the magnificent Credenza cabinet at two hundred seventy-five dollars. Step into your neighborhood Victor dealer for a private salon audition.'
	},
	{
		id: 'ad-atwater-kent',
		sponsor: 'Atwater Kent Manufacturing Co.',
		title: 'Sponsor Message: Atwater Kent Model 35 One-Dial Receiver',
		region: 'national',
		sourceTitle: 'Atwater Kent Pooley Cabinet Advertisement',
		scriptText:
			'A brief announcement from the Atwater Kent Manufacturing Company of Philadelphia — Why adjust three fussy dials when one smooth control brings in the whole nation?\n\nThe new Atwater Kent Model 35 six-tube receiver, housed in a crystalline-finished steel shield with walnut trim, delivers remarkable distance and crisp tone at the turn of a single master knob. Every circuit is factory-balanced by master radio craftsmen.\n\nAt seventy dollars without accessories, it brings dependable coast-to-coast reception within the reach of every thrifty household. See your authorized Atwater Kent dealer at the sign of the golden plate.'
	},
	{
		id: 'ad-ford-model-t',
		sponsor: 'Ford Motor Company',
		title: 'Sponsor Message: The Improved Ford Tudor Sedan',
		region: 'midwest',
		sourceTitle: 'Ford Motor Company Authorized Dealer Copy',
		scriptText:
			'Presented by your authorized Ford dealers — Have you inspected the Improved Ford Tudor Sedan in deep Highland Green or Channel Green pyroxylin finish?\n\nWith lower streamlined coachwork, deeper cushioned seats, balloon tires, and electric starter included, the Universal Car now offers closed-car comfort for all four seasons at the lowest cost per mile in motoring history. Rain or snow need never interrupt your family’s church attendance or country excursions.\n\nThe Tudor Sedan is delivered at four hundred ninety-five dollars f.o.b. Detroit, and the dependable Runabout at three hundred sixty dollars. Arrange a demonstration drive on your neighborhood boulevard this week.'
	},
	{
		id: 'ad-maxwell-house',
		sponsor: 'Cheek-Neal Coffee Company',
		title: 'Sponsor Message: Maxwell House Coffee — Good to the Last Drop',
		region: 'national',
		sourceTitle: 'Maxwell House Blue Tin Campaign',
		scriptText:
			'Before our next dispatch, a word of hospitality from the Cheek-Neal Coffee Company — When guests gather round your dining table this evening, serve the celebrated blend first roasted for the historic Maxwell House in Nashville.\n\nRare highland beans from South and Central America are blended with consummate skill, slow-roasted to capture every fragrant volatile oil, and sealed fresh in the familiar blue tin so the morning pot tastes as rich as the finest hotel dining room.\n\nRemember the royal tribute: Good to the Last Drop! Ask your neighborhood grocer tomorrow for Maxwell House Coffee, either steel-cut for percolator or pulverized for drip.'
	},
	{
		id: 'ad-eveready-batteries',
		sponsor: 'National Carbon Company',
		title: 'Sponsor Message: Eveready Layerbilt Radio "B" Batteries',
		region: 'national',
		sourceTitle: 'Eveready Layerbilt Technical Broadside',
		scriptText:
			'Are your distant stations fading into faint whispers after midnight? Listen carefully to this message from the National Carbon Company.\n\nUnlike ordinary round-cell B batteries wasted by hollow air spaces and brittle soldered wires, the heavy-duty Eveready Layerbilt number four-eighty-six packs flat active zinc and carbon plates edge-to-edge under tremendous hydraulic pressure. You receive far more active current-producing material for every dollar spent.\n\nInsist on genuine Eveready Layerbilt forty-five-volt blocks at your radio supply counter and keep your tubes singing at full plate voltage all winter long.'
	},
	{
		id: 'ad-gillette-razor',
		sponsor: 'Gillette Safety Razor Company',
		title: 'Sponsor Message: The New Improved Gillette Safety Razor',
		region: 'national',
		sourceTitle: 'Gillette Bostonian Display Advertisement',
		scriptText:
			'Gentlemen listeners, a crisp morning begins with a clean edge — brought to you by the Gillette Safety Razor Company of Boston.\n\nThe New Improved Gillette features precision-micrometered blade clamping, holding the tempered Swedish steel edge at the exact scientific angle to sever the toughest beard without scraping tender skin. Gone are the tedious mornings of stropping and honing old-fashioned straight razors.\n\nHandsomely packaged in the silver-plated Bostonian or gold-plated Tuckaway travel case starting at five dollars, with fresh packets of Gillette blades available at every drugstore and tobacconist in America.'
	},
	{
		id: 'ad-packard-six',
		sponsor: 'Packard Motor Car Company',
		title: 'Sponsor Message: Packard Six Sedan — Ask the Man Who Owns One',
		region: 'midwest',
		sourceTitle: 'Packard Six National Magazine Copy',
		scriptText:
			'A message of distinction from the Packard Motor Car Company of Detroit — Certain names in American industry stand as benchmarks of enduring craftsmanship.\n\nWith its unmistakable radiator crown, silent six-cylinder engine with centralized chassis lubrication, and coachwork trimmed in genuine broadcloth, the Packard Six glides over boulevard cobblestones and rural macadam with effortless poise.\n\nPrices for the five-passenger Packard Six Sedan begin at twenty-five hundred eighty-five dollars at the factory. As our friends have declared for twenty-seven years: Ask the man who owns one.'
	},
	{
		id: 'ad-wrigley-spearmint',
		sponsor: 'Wm. Wrigley Jr. Company',
		title: 'Sponsor Message: Wrigley’s Spearmint — After Every Meal',
		region: 'midwest',
		sourceTitle: 'Wrigley Building Chicago Broadcast Copy',
		scriptText:
			'From the gleaming white Wrigley Building beside the Michigan Avenue Bridge in Chicago comes this cheerful reminder — Keep a bright yellow or green package of Wrigley’s Spearmint or Doublemint close at hand!\n\nA stick of cool, brisk garden mint after every meal aids digestion, brightens the teeth, and steadies the nerves during busy afternoons at the counting desk or motor wheel.\n\nFreshly wrapped in sanitary sealed wax paper to guard its crisp flavor in any climate — still only five cents a package at every newsstand, confectioner, and railway depot.'
	},
	{
		id: 'ad-palmolive-soap',
		sponsor: 'Palmolive-Peet Company',
		title: 'Sponsor Message: Palmolive — Keep That Schoolgirl Complexion',
		region: 'midwest',
		sourceTitle: 'Palmolive Chicago Print & Radio Copy',
		scriptText:
			'Ladies in our listening audience, a gentle word from the Palmolive Company of Chicago and Milwaukee — True complexion beauty begins with pure vegetable oils rather than harsh animal tallows or artificial dyes.\n\nEach fragrant green cake of Palmolive blends soothing olive oil from the Mediterranean with rich African palm oil into a creamy, velvety lather that cleanses pores gently before rinsing away in cool water.\n\nJust ten cents a cake at drug and department stores everywhere. Make the simple two-minute Palmolive routine your nightly habit and keep that natural schoolgirl complexion.'
	},
	{
		id: 'ad-sears-silvertone',
		sponsor: 'Sears, Roebuck and Co.',
		title: 'Sponsor Message: Sears Silvertone Console Receiver',
		region: 'midwest',
		sourceTitle: 'Sears Roebuck Radio Catalog No. 153',
		scriptText:
			'Neighbors across the farms, prairies, and towns of the heartland — Sears, Roebuck and Company of Chicago invites you to inspect the new six-tube Silvertone Neutrodyne Console in our seasonal catalog.\n\nDirect from our giant Chicago mail-order plant to your front porch with no middleman markups, the Silvertone pairs an inlaid walnut cabinet and built-in horn speaker with rock-solid distance reception capable of pulling in Chicago, New York, and Kansas City alike.\n\nComplete with storage battery, charger, and tubes for seventy-nine dollars and fifty cents, backed by Sears ironclad guarantee of satisfaction or your money cheerfully refunded.'
	},
	{
		id: 'ad-heinz-57',
		sponsor: 'H. J. Heinz Company',
		title: 'Sponsor Message: Heinz 57 Varieties Oven-Baked Beans',
		region: 'national',
		sourceTitle: 'Heinz Pure Food Kitchens Advertisement',
		scriptText:
			'Tonight’s intermission comes with the warm wishes of the H. J. Heinz Company — from our spotless brick kitchens in Pittsburgh.\n\nTrue old-fashioned New England baked beans are never merely boiled in steam vats. Heinz selects plump Michigan navy beans and bakes them slowly in dry brick ovens until every bean turns mealy, golden brown, and tender, finished with savory pork and rich red Heinz tomato sauce.\n\nStock your pantry shelf with the famous 57 Varieties tomorrow — pure, wholesome food prepared with the care of a mother’s kitchen.'
	},
	{
		id: 'ad-goodrich-tires',
		sponsor: 'B. F. Goodrich Rubber Company',
		title: 'Sponsor Message: Goodrich Silvertown Balloon Cords',
		region: 'midwest',
		sourceTitle: 'Goodrich Silvertown Akron Copy',
		scriptText:
			'Motorists preparing for weekend highway travel, heed this timely counsel from the B. F. Goodrich Rubber Company of Akron, Ohio.\n\nWet autumn leaves and rutted gravel roads test every tire carcass to the utmost. Goodrich Silvertown Balloon Cords feature the famous safety tread blocks scientifically notched to grip slick asphalt and muddy macadam alike, cushioning every shock across your front axle.\n\nStop by the nearest Silvertown Service Station before your next long tour and let a trained vulcanizer inspect your pressures and spare rim.'
	},
	{
		id: 'ad-pepsodent',
		sponsor: 'The Pepsodent Company',
		title: 'Sponsor Message: Pepsodent — The New-Day Quality Dentifrice',
		region: 'midwest',
		sourceTitle: 'Pepsodent Chicago Newspaper Copy',
		scriptText:
			'A brief health bulletin from the Pepsodent Company of Chicago — Leading dental authorities now recognize that dingy film clinging to enamel is the chief enemy of bright teeth and sound gums.\n\nOrdinary chalk powders merely polish the surface, whereas Pepsodent’s gentle modern formula curdles and removes that stubborn film safely every morning and night, leaving teeth sparkling white and breath clean.\n\nObtain the full-size tube at your corner druggist tomorrow for fifty cents, or ask for a ten-day trial tube.'
	},
	{
		id: 'ad-ivory-soap',
		sponsor: 'Procter & Gamble',
		title: 'Sponsor Message: Ivory Soap — 99 44/100% Pure, It Floats',
		region: 'national',
		sourceTitle: 'Procter & Gamble Ivory Copy',
		scriptText:
			'A moment in your home brought to you by Procter and Gamble — Since 1879, Ivory Soap has stood beside American washbasins as the unfailing standard of mildness and purity.\n\nFree from harsh alkalis or heavy perfumes, Ivory’s crisp white cake is ninety-nine and forty-four one-hundredths percent pure—safe enough for an infant’s bath, gentle enough for delicate silk stockings and fine lace curtains, and famous across every household because it floats right at your fingertips.\n\nKeep an ample box of Ivory bars in your linen closet for bath, nursery, and fine laundry alike.'
	},
	{
		id: 'ad-pullman-rail',
		sponsor: 'The Pullman Company',
		title: 'Sponsor Message: Travel in Comfort via Pullman Sleeping Cars',
		region: 'midwest',
		sourceTitle: 'Pullman Company Century Rail Advertisement',
		scriptText:
			'Planning an overnight business journey from Chicago to New York, St. Louis, or Minneapolis? Then listen to this invitation from the Pullman Company.\n\nWhy arrive weary from fighting dark highways or sitting upright in day coaches when a quiet lower berth aboard a steel Pullman sleeper lets you dine in the club car at dusk, enjoy a full eight hours of crisp-sheeted slumber, and step onto the terminal concourse refreshed at eight o’clock tomorrow morning?\n\nReserve your drawing room, compartment, or standard berth at any Union Station ticket window.'
	}
];

function hashString(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function pickVintageAds(isoDate: string, stationId: StationId, count = 2): VintageAdCopy[] {
	const preferred =
		stationId === 'wgn'
			? [...VINTAGE_ADS.filter((a) => a.region === 'midwest'), ...VINTAGE_ADS.filter((a) => a.region === 'national')]
			: [...VINTAGE_ADS.filter((a) => a.region === 'national'), ...VINTAGE_ADS.filter((a) => a.region === 'midwest')];

	const seed = hashString(`${isoDate}-${stationId}-ads`);
	const selected: VintageAdCopy[] = [];
	const usedIds = new Set<string>();

	for (let i = 0; i < count; i++) {
		let idx = (seed + i * 5) % preferred.length;
		let guard = 0;
		while (usedIds.has(preferred[idx].id) && guard < preferred.length) {
			idx = (idx + 1) % preferred.length;
			guard++;
		}
		usedIds.add(preferred[idx].id);
		selected.push(preferred[idx]);
	}
	return selected;
}

export function buildSeasonalWeatherReport(isoDate: string, stationId: StationId): string {
	const [yearStr, monthStr, dayStr] = isoDate.split('-');
	const month = Number(monthStr) || 11;
	const day = Number(dayStr) || 15;
	const seed = hashString(`${isoDate}-${stationId}-wx`);
	const baro = (29.82 + (seed % 52) / 100).toFixed(2);
	const longDate = formatCenturyDateLong(isoDate);

	const isWinter = month === 12 || month <= 2;
	const isSpring = month >= 3 && month <= 5;
	const isSummer = month >= 6 && month <= 8;

	if (stationId === 'wgn') {
		if (isWinter) {
			const low = 10 + (seed % 14);
			const high = low + 14;
			return `Here is the official evening forecast telegraphed from the United States Weather Bureau office in the Federal Building, Chicago, for ${longDate}.\n\nA brisk arctic high-pressure crest moving southeast across Manitoba and Dakota is sweeping freezing air across Lake Michigan and the Illinois prairies. Barometer reads ${baro} inches and rising steadily. Tonight in Chicago and northern Illinois: Partly cloudy and sharply colder, with stinging northwest winds at twenty-two miles per hour; temperatures dropping to ${low} degrees before dawn, with light lake-effect snow flurries along the Indiana dunes.\n\nTomorrow: Crisp winter sunshine, high near ${high} degrees. Advisory to Lake Michigan car-ferries and late-season coal barges: Storm warning pennants are displayed from Milwaukee to the Straits of Mackinac; fresh northwest gales and heavy ice spray anticipated offshore.`;
		}
		if (isSpring) {
			const low = 42 + (seed % 12);
			const high = low + 19;
			return `We bring you the official Great Lakes and Upper Mississippi Valley bulletin prepared by the United States Weather Bureau in Chicago for ${longDate}.\n\nBarometric pressure stands at ${baro} inches as a mild southwestern current ascends the Illinois River basin. Tonight across Chicago, Milwaukee, and Des Moines: Mostly fair with scattered high clouds and gentle southerly breezes; minimum temperatures near ${low} degrees, favorable for spring plowing and winter wheat growth.\n\nTomorrow: Pleasant and slightly warmer with highs reaching ${high} degrees, with light evening showers possible west of the Mississippi. For Great Lakes shipping: Moderate south-southwest winds of fourteen to twenty knots, visibility clear, and fair navigating conditions across Lake Michigan and Huron.`;
		}
		if (isSummer) {
			const low = 66 + (seed % 8);
			const high = 84 + (seed % 10);
			return `Here is the evening meteorological dispatch from the Chicago Weather Bureau for ${longDate}.\n\nWarm summer air continues to blanket the Corn Belt under a sluggish ridge of high pressure, barometer steady at ${baro} inches. Tonight in metropolitan Chicago: Warm and humid until midnight, relieved by cooling lake breezes east of Michigan Avenue; lowest thermometer reading near ${low} degrees.\n\nTomorrow: Abundant sunshine and hot inland, highs ascending to ${high} degrees in downstate Illinois and Iowa, with scattered late-afternoon thunder squalls bringing welcome moisture to tassels and pastures. Lake Michigan steamers report light variable winds, smooth water, and clear horizons.`;
		}
		// Autumn
		const low = 31 + (seed % 14);
		const high = low + 17;
		return `We turn now to the official Great Lakes and Prairie forecast issued by the United States Weather Bureau in Chicago for ${longDate}.\n\nA crisp autumn high centered over Lake Superior is spreading clear skies across Illinois, Wisconsin, and Michigan, with the mercury falling steadily and barometer reading ${baro} inches. Tonight: Clear and brisk with light frost in outlying truck gardens; low temperature near ${low} degrees.\n\nTomorrow: Bright autumn sunshine, moderate westerly breezes, high near ${high} degrees. To masters of Lake Michigan ore carriers and grain steamers: Moderate northwest swells, visibility eight miles, no storm warnings on the upper lakes tonight.`;
	}

	// WCRN-AM (New York / Atlantic Seaboard)
	if (isWinter) {
		const low = 18 + (seed % 14);
		const high = low + 15;
		return `Here is the official evening meteorological dispatch prepared by the United States Weather Bureau at the Whitehall Building in Battery Park, New York, for ${longDate}.\n\nAn energetic area of high barometric pressure descending from the St. Lawrence Valley holds Manhattan, Long Island, and New Jersey in crisp winter stillness. Barometer reads ${baro} inches. Tonight: Clear skies and freezing temperatures, descending to ${low} degrees in suburban Westchester and northern New Jersey, with brisk northwest gusts along the Hudson.\n\nTomorrow: Fair and cold with pale winter sunlight, highest temperature near ${high} degrees. For Atlantic coastwise shipping between Boston Light and Cape Hatteras: Fresh northwest winds of eighteen to twenty-five knots, choppy seas offshore, visibility clear at nine miles.`;
	}
	if (isSpring) {
		const low = 44 + (seed % 11);
		const high = low + 18;
		return `We present the evening regional forecast issued by the United States Weather Bureau in New York City for ${longDate}.\n\nWith the barometer steady at ${baro} inches and soft maritime breezes arriving off Sandy Hook, spring mildness is settling comfortably over the Atlantic Seaboard. Tonight in Manhattan and Brooklyn: Fair with patchy harbor mist near dawn, low near ${low} degrees.\n\nTomorrow: Bright sunshine and mild afternoon warmth, thermometer rising to ${high} degrees across New Jersey and the lower Hudson Valley. For transatlantic liners and coastal steamships departing Ambrose Channel: Light southwesterly winds ten to fourteen knots, smooth ocean swells, and excellent visibility.`;
	}
	if (isSummer) {
		const low = 68 + (seed % 8);
		const high = 84 + (seed % 9);
		return `Here is the official metropolitan and coastal bulletin from the United States Weather Bureau atop the Whitehall Building in Manhattan for ${longDate}.\n\nA broad Bermuda high-pressure ridge keeps humid summer warmth anchored along the seaboard; barometer reads ${baro} inches. Tonight: Warm and sultry through early evening before gentle sea breezes sweep Coney Island and Long Island Sound, low near ${low} degrees.\n\nTomorrow: Partly cloudy and warm with highs near ${high} degrees inland and refreshing salt breezes along the beaches; scattered evening thundershowers possible west of Newark. Atlantic shipping reports light southwest airs, gentle swells, and good visibility.`;
	}
	// Autumn
	const low = 32 + ((day + seed) % 14);
	const high = low + 16;
	return `We turn now to the official regional and maritime bulletin prepared by the United States Weather Bureau in New York for ${longDate}.\n\nA crisp autumn high centered over the Ohio Valley is advancing toward the Atlantic coast, bringing clear evening skies and invigorating air across Manhattan, Long Island, and New England. Barometer stands at ${baro} inches. Tonight: Fair and colder, thermometer descending to ${low} degrees in outlying districts with light frost by sunrise.\n\nTomorrow: Crisp sunshine and mild afternoon breeze, highest temperature near ${high} degrees. For shipping interests between Cape Cod and the Virginia Capes: Moderate northwesterly winds twelve to eighteen knots, smooth to moderate sea, visibility eight miles.`;
}

export function buildMarketReport(
	isoDate: string,
	stationId: StationId,
	commerceFact?: IngestedFact
): string {
	const year = Number(isoDate.slice(0, 4)) || 1926;
	const seed = hashString(`${isoDate}-${stationId}-mkt`);
	const factAddendum = commerceFact
		? `\n\nIn broader commercial dispatches today: ${commerceFact.text}`
		: '';

	if (stationId === 'wgn') {
		const wheatPrice = year >= 1927 ? 'one dollar and thirty-nine cents' : 'one dollar and thirty-seven cents';
		const cornCent = 74 + (seed % 11);
		const hogPrice = (10.8 + (seed % 15) / 10).toFixed(2);
		const wardsPts = year >= 1927 ? 'seventy-four and one-quarter' : 'sixty-seven and three-eighths';

		return `From the LaSalle Street financial desk — The closing bell has rung across the pit of the Chicago Board of Trade, concluding an active session in grains and Midwest industrials.\n\nContract December wheat displayed firm undertone on brisk milling inquiry from Minneapolis and Buffalo, closing up five-eighths of a cent at ${wheatPrice} a bushel. Corn futures held steady at ${cornCent} cents, while oats gained fractionally on lighter country elevator receipts. At the Union Stock Yards, choice heavy hogs changed hands around ${hogPrice} dollars per hundredweight under steady packer demand.\n\nOn the Chicago Stock Exchange, mail-order and utility leaders attracted heavy institutional orders. Montgomery Ward closed at ${wardsPts}, Sears Roebuck added one and one-eighth points, and Commonwealth Edison remained well bid by conservative investors.${factAddendum}`;
	}

	const callRate = seed % 2 === 0 ? 'four and one-half percent' : 'four and three-quarters percent';
	const steelClose = year >= 1927 ? 'one hundred fifty-four and one-half' : 'one hundred forty-six and one-eighth';
	const rcaClose = year >= 1927 ? 'sixty-four and three-quarters' : 'fifty-eight and one-quarter';
	const geClose = year >= 1927 ? 'ninety-six and seven-eighths' : 'eighty-four and one-half';

	return `Turning now to our Wall Street financial desk — The ticker tape has quieted on the floor of the New York Stock Exchange following a session of vigorous investment accumulation and selective profit-taking.\n\nCall money renewed smoothly at ${callRate}, with ample commercial balances available from downtown clearing-house banks. United States Steel paced the heavy industrials, finishing at ${steelClose}, while General Electric advanced cleanly to ${geClose}. Radio Corporation of America traded actively across the final hour to settle at ${rcaClose} on sustained enthusiasm for cabinet receiver sales.\n\nOn the New York Curb Exchange, public utility holding shares and electric light bonds remained in brisk demand, while foreign dollar obligations held steady in calm European exchange trading.${factAddendum}`;
}

export interface DramaScript {
	showName: string;
	title: string;
	speakerRole: string;
	scriptText: string;
}

export function pickRadioDrama(isoDate: string, stationId: StationId, leadHeadline: string): DramaScript {
	const longDate = formatCenturyDateLong(isoDate);
	const year = Number(isoDate.slice(0, 4)) || 1926;
	const seed = hashString(`${isoDate}-${stationId}-drama`);

	const dramas: DramaScript[] = [
		{
			showName: 'The Century Mystery Playhouse',
			title: 'The Midnight Wire at Grand Central',
			speakerRole: 'Dramatic Repertory Cast (4 Voices)',
			scriptText: `ANNOUNCER: Welcome once again to The Century Mystery Playhouse, broadcast live on this evening of ${longDate}. Tonight’s original radio drama: The Midnight Wire at Grand Central!\n\nCLARA: Look at the telegraph tape trembling on the mahogany desk, Inspector. Why would a coded message arrive from the night dispatcher at track twenty-two?\n\nINSPECTOR: Keep your voice low, Miss Vance. This ribbon came straight off the express trunk line thirty minutes before the Twentieth Century Limited pulled out.\n\nREPORTER: Gentlemen—forgive the intrusion, I just came off the city desk! Everyone in Manhattan is already reading tonight’s bulletin: ${leadHeadline} Could this dispatch be connected?\n\nINSPECTOR: Precisely what I intend to learn before midnight, young man. Miss Vance, fetch the stationmaster’s ledger and double-bolt the parlor door—someone on this concourse knows more than they are telling!\n\nANNOUNCER: Stay tuned for next week’s thrilling chapter of The Century Mystery Playhouse, right here on your clear-channel dial.`
		},
		{
			showName: 'Silver Star Detective Hour',
			title: 'Static from the North Atlantic',
			speakerRole: 'Dramatic Repertory Cast (4 Voices)',
			scriptText: `ANNOUNCER: The Silver Star Detective Hour brings you an original wireless thriller for ${longDate}: Static from the North Atlantic.\n\nCAPTAIN: Spark operator! Tune that regenerative receiver a hair finer to six hundred meters—there is a faint call struggling through the storm!\n\nREPORTER: Captain Mercer, I copied the first three letters down in shorthand. Wait—was that Chatham Marine Wireless calling or a freighter fifty miles off Nantucket?\n\nMARGARET: Listen closely! Beneath the thunder-static, someone is tapping a commercial press cipher. And look at the morning gazette left in the chart room—word has just broken that ${leadHeadline}\n\nCAPTAIN: Then there isn’t a moment to spare! Set the ship’s chronometer by Arlington, sound the engine-room telegraph, and tell the helmsman to hold northeast by north until daylight!\n\nANNOUNCER: And so another perilous night closes on the high seas—courtesy of the Silver Star Dramatic Players.`
		},
		{
			showName: 'Parlor Playhouse of the Air',
			title: 'The Copper-Wire Cipher',
			speakerRole: 'Dramatic Repertory Cast (4 Voices)',
			scriptText: `ANNOUNCER: Pull your armchair closer to the speaker horn for the Parlor Playhouse of the Air on ${longDate}. Tonight’s play: The Copper-Wire Cipher.\n\nELEANOR: Uncle Arthur, why have you kept your crystal headphones clamped over your ears since seven o’clock? The Victrola is waiting in the parlor!\n\nARTHUR: Listen, Eleanor—never mind the foxtrot tonight. An unlicensed short-wave transmitter somewhere across the river has been interrupting the evening news bulletins.\n\nINSPECTOR: Good evening, folks. Pardon me for stepping in from the rain, but our direction-finding loop antenna pointed straight down your avenue. Have either of you heard anyone discussing today’s big dispatch: ${leadHeadline}\n\nELEANOR: Why, yes! The boarder on the third floor hurried out with a black leather satchel not ten minutes after that bulletin came over the air!\n\nANNOUNCER: Swift footsteps echo down the wet cobblestone street—join us tomorrow night to uncover the rest of The Copper-Wire Cipher!`
		},
		{
			showName: 'Midwest Hearthside Theatre',
			title: 'The Wabash Express Dispatch',
			speakerRole: 'Dramatic Repertory Cast (4 Voices)',
			scriptText: `ANNOUNCER: From our main studio dramatic stage on ${longDate}, the Midwest Hearthside Theatre presents: The Wabash Express Dispatch.\n\nREPORTER: Hold the late edition presses, chief! The night operator at Decatur Junction just flashed an extraordinary warning across the wire!\n\nCLARA: Steady, Billy—you’re out of breath. Hang up your wet overcoat and read what the ticker printed beside the lantern.\n\nHAROLD: First came the evening wire item everyone on LaSalle Street is debating: ${leadHeadline} Right behind it came a sealed envelope addressed to the rail superintendent—marked Urgent, Open Before Eleven!\n\nCLARA: Listen—do you hear the brass bell of number forty-two pulling into the shed right now? If we reach the platform before the conductor waves his lantern, we can still verify the whole story before sunrise!\n\nANNOUNCER: Keep your dial locked right here as the rails sing into the ${year} night.`
		}
	];

	return dramas[seed % dramas.length];
}

export function getSeasonalSportsContext(month: number, year: number, stationId: StationId): string {
	const isWinter = month === 12 || month <= 2;
	const isSpring = month >= 3 && month <= 5;
	const isSummer = month >= 6 && month <= 8;

	if (isWinter) {
		return stationId === 'wgn'
			? `Winter sporting fever across Chicago and the Great Lakes reaches high pitch inside Madison Street and Coliseum arenas. Ice hockey enthusiasts are flocking to watch the newly organized Chicago Black Hawks battle Canadian and Eastern rivals in the expanding National Hockey League, while championship boxing cards and Big Ten basketball rivalries keep telegraph wires humming.\n\nAlong Randolph Street and the Loop theater district, winter dramatic revues and grand motion-picture palaces are playing to packed matinee and evening audiences warmed by blazing marquee lights.`
			: `Winter athletic excitement centers indoors beneath the roaring rafters of the new Madison Square Garden on Eighth Avenue. Crowds cheer professional ice hockey as the New York Rangers and New York Americans battle across gleaming ice, while heavyweight boxing promoters plot winter eliminations and six-day bicycle racers circle the banked pine oval.\n\nAlong Broadway, winter theatrical openings and opulent motion-picture palaces fill Times Square with glittering crowds defying the brisk evening air.`;
	}
	if (isSpring) {
		return stationId === 'wgn'
			? `Spring optimism radiates across Cubs Park and Comiskey Park as Midwest baseball clubs polish their batting eyes for the ${year} National and American League campaigns. On the turf, horsemen look eagerly toward Louisville and the Kentucky Derby, while Big Ten track and field athletes break records under clear spring skies.\n\nIn downtown Chicago theaters, new spring musical comedies and touring metropolitan opera ensembles draw overflowing evening patronage.`
			: `Baseball fever returns to New York as the Yankees, Giants, and Brooklyn Robins launch the ${year} major league campaign before roaring Opening Day grandstands. Along the turf circuit, stable scouts watch leading three-year-olds prepare for the spring stakes, while boxing contenders spar in uptown gymnasiums.\n\nBroadway’s spring season glitters with fresh musical revues, sparkling Gershwin rhythms, and magnificent new picture palaces greeting crowds nightly.`;
	}
	if (isSummer) {
		return stationId === 'wgn'
			? `Midsummer pennant races dominate the sports pages from Chicago to St. Louis, with afternoon bleachers packed beneath sunlit skies as Midwest clubs battle for first-division standing. On the fairways and tennis courts, American amateurs continue to dazzle international galleries.\n\nThroughout the warm summer evenings, lakefront concert pavilions, open-air roof gardens, and Loop picture houses cool thousands of city dwellers with music and silver-screen spectacle.`
			: `Summer sporting glory fills stadiums from the Polo Grounds and Yankee Stadium to Forest Hills and the Atlantic shore. Pennant contenders trade heavy blows in scorching afternoon doubleheaders while American swimmers and golfers capture headlines on both sides of the ocean.\n\nOn Broadway, chilled air-cooled picture palaces and rooftop musical cabarets attract theatergoers seeking breezy evening entertainment.`;
	}
	// Autumn
	return stationId === 'wgn'
		? `Autumn athletic rivalry reaches fever pitch across the gridirons of the Big Ten and Midwest stadiums, where packed stands roar through crisp afternoon air. Baseball followers continue dissecting the dramatic ${year === 1927 ? 'Yankees power surge and National League race' : 'World Series triumph and fall classic pitching duels'}, while boxing circles debate heavyweight contenders.\n\nAlong Chicago’s theater row, autumn openings bring fresh dramatic plays, symphony concerts at Orchestra Hall, and grand cinema premieres.`
		: `Autumn brings crisp football weekends across Eastern college bowls alongside lingering World Series chatter and brisk Madison Square Garden boxing cards. Promoters report record gate receipts as Gene Tunney, Jack Dempsey, and Babe Ruth keep American sports pages ablaze.\n\nAlong the Great White Way, autumn marks the height of the theatrical calendar, with dazzling musical comedies and grand theater premieres drawing evening crowds.`;
}
