import type { HistoricalSource, TopicTag } from '$lib/types/broadcast';

export interface IngestedFact {
	kind: 'event' | 'birth' | 'death' | 'newspaper';
	year: number;
	date: string;
	text: string;
	source: HistoricalSource;
	detailedContext?: string;
	category?: string;
	relatedEntities?: string[];
}

interface WikimediaPage {
	title?: string;
	extract?: string;
	description?: string;
	content_urls?: { desktop?: { page?: string } };
}

interface WikimediaItem {
	text?: string;
	year?: number;
	pages?: WikimediaPage[];
}

interface WikimediaResponse {
	selected?: WikimediaItem[];
	events?: WikimediaItem[];
	births?: WikimediaItem[];
	deaths?: WikimediaItem[];
}

function inferCategoryFromText(text: string): TopicTag {
	const lower = text.toLowerCase();
	if (/flight|plane|aviation|airship|dirigible|pilot|aeronautic|byrd|lindbergh/.test(lower)) {
		return 'aviation';
	}
	if (/baseball|boxing|dempsey|tunney|game|championship|cup|race|stadium|tennis|football|olympic/.test(lower)) {
		return 'sports';
	}
	if (/treaty|senate|president|minister|election|congress|league of nations|parliament|governor|court/.test(lower)) {
		return 'politics';
	}
	if (/market|stock|bank|trade|commerce|tariff|strike|labor|railway|corporation|dollar/.test(lower)) {
		return 'commerce';
	}
	if (/storm|hurricane|gale|flood|blizzard|snow|temperature|weather|drought|earthquake/.test(lower)) {
		return 'weather';
	}
	return 'culture';
}

async function fetchDayFeed(month: number, day: number): Promise<WikimediaResponse | null> {
	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${mm}/${dd}`;

	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'CenturyRadio/1.0 (https://century-radio.vercel.app)',
				Accept: 'application/json'
			},
			signal: AbortSignal.timeout(2500)
		});
		if (!res.ok) return null;
		return (await res.json()) as WikimediaResponse;
	} catch {
		return null;
	}
}

export function extractMatchingItems(
	feed: WikimediaResponse | null,
	targetYear: number,
	isoDate: string
): IngestedFact[] {
	if (!feed) return [];
	const facts: IngestedFact[] = [];
	const seen = new Set<string>();

	const collect = (items: WikimediaItem[] | undefined, kind: IngestedFact['kind']) => {
		for (const item of items ?? []) {
			if (item.year !== targetYear || !item.text) continue;
			const cleanText = item.text.trim();
			if (seen.has(cleanText)) continue;
			seen.add(cleanText);

			const pages = item.pages ?? [];
			const firstPage = pages[0];
			const relatedEntities = pages
				.map((p) => p.title?.replace(/_/g, ' ').trim())
				.filter((t): t is string => Boolean(t));

			const contextEntries: string[] = [];
			for (const page of pages.slice(0, 3)) {
				const entityName = page.title?.replace(/_/g, ' ').trim();
				const desc = page.description?.trim();
				const ext = page.extract?.trim();
				if (ext) {
					contextEntries.push(desc ? `${entityName} (${desc}): ${ext}` : `${entityName}: ${ext}`);
				} else if (desc) {
					contextEntries.push(`${entityName}: ${desc}`);
				}
			}

			const detailedContext = contextEntries.length > 0 ? contextEntries.join('\n\n') : undefined;
			const category = inferCategoryFromText(cleanText);

			facts.push({
				kind,
				year: targetYear,
				date: isoDate,
				text: cleanText,
				source: {
					provider: 'wikipedia',
					title: firstPage?.title?.replace(/_/g, ' ') ?? `Wikipedia On This Day (${isoDate})`,
					url: firstPage?.content_urls?.desktop?.page,
					originalDate: isoDate
				},
				detailedContext,
				category,
				relatedEntities: relatedEntities.length > 0 ? relatedEntities : undefined
			});
		}
	};

	collect(feed.selected, 'event');
	collect(feed.events, 'event');
	collect(feed.births, 'birth');
	collect(feed.deaths, 'death');
	return facts;
}

export async function fetchWikimediaOnThisDay(isoDate: string): Promise<IngestedFact[]> {
	const [year, month, day] = isoDate.split('-').map(Number);
	if (!year || !month || !day) return [];

	const primaryFeed = await fetchDayFeed(month, day);
	const results = extractMatchingItems(primaryFeed, year, isoDate);

	// If no events found on exact day, check adjacent day once
	if (results.length === 0) {
		const d = new Date(Date.UTC(year, month - 1, day - 1));
		const altIso = d.toISOString().slice(0, 10);
		const altFeed = await fetchDayFeed(d.getUTCMonth() + 1, d.getUTCDate());
		const altFacts = extractMatchingItems(altFeed, d.getUTCFullYear(), altIso);
		for (const fact of altFacts) {
			if (!results.some((r) => r.text === fact.text)) {
				results.push(fact);
			}
		}
	}

	return results.slice(0, 8);
}
