import { getCachedJson, setCachedJson } from '$lib/server/cache/blobCache';
import { cleanWikitext } from './wikiChronicle';
import { inferCategoryFromText, type IngestedFact } from './wikimedia';

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

async function fetchWikiPageWikitext(pageTitle: string, cacheKey: string): Promise<string | null> {
	const cached = await getCachedJson<{ wikitext: string }>(cacheKey);
	if (cached?.wikitext) return cached.wikitext;

	const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
		pageTitle
	)}&prop=wikitext&format=json`;
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'CenturyRadio/1.0 (https://century-radio.vercel.app)',
				Accept: 'application/json'
			},
			signal: AbortSignal.timeout(6000)
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { parse?: { wikitext?: { '*'?: string } } };
		const wikitext = data.parse?.wikitext?.['*'];
		if (!wikitext) return null;
		await setCachedJson(cacheKey, { wikitext });
		return wikitext;
	} catch {
		return null;
	}
}

export function extractMonthBulletsFromYearPage(
	wikitext: string,
	year: number,
	month: number,
	isoDate: string,
	pageLabel: string,
	pageUrl: string
): IngestedFact[] {
	const monthName = MONTH_NAMES[month - 1];
	if (!monthName || !wikitext) return [];

	const lines = wikitext.split(/\r?\n/);
	const monthRe = new RegExp(`\\b${monthName}\\b`, 'i');
	const results: IngestedFact[] = [];
	const seen = new Set<string>();

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith('*')) continue;
		if (!monthRe.test(trimmed)) continue;

		const cleaned = cleanWikitext(trimmed.replace(/^\*+\s*/, ''));
		if (cleaned.length < 24 || cleaned.length > 420) continue;
		const key = cleaned.toLowerCase().slice(0, 60);
		if (seen.has(key)) continue;
		seen.add(key);

		results.push({
			kind: 'event',
			year,
			date: isoDate,
			text: cleaned,
			source: {
				provider: 'wikipedia',
				title: `${pageLabel} (${monthName} ${year})`,
				url: pageUrl,
				originalDate: `${year}-${String(month).padStart(2, '0')}`
			},
			category: inferCategoryFromText(cleaned)
		});
		if (results.length >= 4) break;
	}

	return results;
}

export async function fetchWikiYearContext(isoDate: string): Promise<IngestedFact[]> {
	const [year, month] = isoDate.split('-').map(Number);
	if (!year || !month) return [];

	const [radioText, usText] = await Promise.all([
		fetchWikiPageWikitext(`${year}_in_radio`, `wiki-year/${year}_in_radio.json`),
		fetchWikiPageWikitext(`${year}_in_the_United_States`, `wiki-year/${year}_in_the_United_States.json`)
	]);

	const radioFacts = radioText
		? extractMonthBulletsFromYearPage(
				radioText,
				year,
				month,
				isoDate,
				`${year} in Radio`,
				`https://en.wikipedia.org/wiki/${year}_in_radio`
			).map((f) => ({ ...f, category: 'culture' }))
		: [];

	const usFacts = usText
		? extractMonthBulletsFromYearPage(
				usText,
				year,
				month,
				isoDate,
				`${year} in the United States`,
				`https://en.wikipedia.org/wiki/${year}_in_the_United_States`
			)
		: [];

	return [...radioFacts, ...usFacts].slice(0, 6);
}
