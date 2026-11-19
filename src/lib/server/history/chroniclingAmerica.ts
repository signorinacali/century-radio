import type { IngestedFact } from './wikimedia';

interface LocItem {
	title?: string;
	date?: string;
	url?: string;
	ocr_eng?: string;
}

interface LocResponse {
	items?: LocItem[];
}

export async function fetchChroniclingAmerica(isoDate: string): Promise<IngestedFact[]> {
	const [year, month, day] = isoDate.split('-').map(Number);
	if (!year || !month || !day) return [];

	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	const formatted = `${mm}/${dd}/${year}`;
	const url = `https://chroniclingamerica.loc.gov/search/pages/results/?dateFilterType=range&date1=${encodeURIComponent(
		formatted
	)}&date2=${encodeURIComponent(formatted)}&format=json&rows=3`;

	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'CenturyRadio/1.0',
				Accept: 'application/json'
			},
			signal: AbortSignal.timeout(4000)
		});
		if (!res.ok) return [];
		const data = (await res.json()) as LocResponse;
		const facts: IngestedFact[] = [];

		for (const item of data.items ?? []) {
			const paperTitle = item.title?.trim() || 'American Daily Newspaper';
			const snippet = item.ocr_eng?.replace(/\s+/g, ' ').trim().slice(0, 240);
			if (!snippet) continue;
			facts.push({
				kind: 'newspaper',
				year,
				date: isoDate,
				text: `From ${paperTitle}: ${snippet}`,
				source: {
					provider: 'chronicling_america',
					title: `${paperTitle} (${isoDate})`,
					url: item.url,
					originalDate: isoDate
				}
			});
		}
		return facts;
	} catch {
		return [];
	}
}
