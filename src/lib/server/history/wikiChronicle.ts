import { getCachedJson, setCachedJson } from '$lib/server/cache/blobCache';
import { inferCategoryFromText, type IngestedFact, type PressCitation } from './wikimedia';

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

interface ParsedRawBullet {
	raw: string;
	kind: IngestedFact['kind'];
	text: string;
	linkedTitles: string[];
	relatedEntities: string[];
	pressCitations: PressCitation[];
}

function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&ndash;|&#8211;/g, '–')
		.replace(/&mdash;|&#8212;/g, '—')
		.replace(/&nbsp;|&#160;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function extractCitationParam(template: string, keys: string[]): string | undefined {
	for (const key of keys) {
		const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^|\\}]+)`, 'i');
		const m = template.match(re);
		if (m?.[1]) {
			const val = decodeHtmlEntities(m[1]).replace(/['\[\]]+/g, '').trim();
			if (val) return val;
		}
	}
	return undefined;
}

function extractPressCitations(rawBullet: string, fallbackDate: string): PressCitation[] {
	const citations: PressCitation[] = [];
	const seen = new Set<string>();
	const refRegex = /<ref\b[^>]*>([\s\S]*?)<\/ref>/gi;

	let match: RegExpExecArray | null;
	while ((match = refRegex.exec(rawBullet)) !== null) {
		const inner = match[1];
		if (!/\{\{\s*cite\s+(news|report|magazine|web|book)/i.test(inner)) continue;

		const title = extractCitationParam(inner, ['title', 'chapter']);
		const newspaper = extractCitationParam(inner, ['newspaper', 'work', 'website', 'publisher', 'journal']);
		const url = extractCitationParam(inner, ['url']);
		const date = extractCitationParam(inner, ['date', 'year']) ?? fallbackDate;
		const first = extractCitationParam(inner, ['first', 'first1']);
		const last = extractCitationParam(inner, ['last', 'last1']);
		const author = first && last ? `${first} ${last}` : last;

		if (!title && !newspaper) continue;
		const key = `${newspaper ?? ''}|${title ?? ''}`.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);

		citations.push({
			newspaper: newspaper ?? 'Historical Press Dispatch',
			headline: title ?? newspaper ?? 'Press Dispatch',
			date,
			url: url && /^https?:\/\//i.test(url) ? url : undefined,
			author
		});
	}
	return citations;
}

function extractLinkedWikiTitles(rawBullet: string): { titles: string[]; labels: string[] } {
	const withoutRefs = rawBullet.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<ref\b[^>]*\/>/gi, '');
	const linkRe = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
	const titles: string[] = [];
	const labels: string[] = [];
	const seenTitles = new Set<string>();
	const seenLabels = new Set<string>();

	let m: RegExpExecArray | null;
	while ((m = linkRe.exec(withoutRefs)) !== null) {
		const target = m[1].trim();
		if (!target || /^(File|Image|Category|Special|Wikipedia|Help|Portal):/i.test(target)) continue;
		const label = (m[2] ?? target).trim();
		if (!seenTitles.has(target)) {
			seenTitles.add(target);
			titles.push(target);
		}
		if (label && !seenLabels.has(label)) {
			seenLabels.add(label);
			labels.push(label);
		}
	}
	return { titles, labels };
}

function stripNestedTemplates(text: string): string {
	let result = text;
	// Handle common display templates like {{convert|...}}, {{circa|...}}, {{lang|...|...}}, {{sclass|...}}
	for (let pass = 0; pass < 4; pass++) {
		const next = result.replace(/\{\{([^{}]+)\}\}/g, (_, body: string) => {
			const parts = body.split('|').map((p) => p.trim());
			const name = (parts[0] ?? '').toLowerCase();
			if (name === 'convert' && parts.length >= 3) {
				return `${parts[1]} ${parts[2]}`;
			}
			if ((name === 'circa' || name === 'c.') && parts[1]) {
				return `c. ${parts[1]}`;
			}
			if (name === 'lang' && parts[2]) {
				return parts[2];
			}
			if (name === 'mdash' || name === 'emdash') return '—';
			if (name === 'ndash' || name === 'endash') return '–';
			return '';
		});
		if (next === result) break;
		result = next;
	}
	return result;
}

export function cleanWikitext(raw: string): string {
	let cleaned = raw
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
		.replace(/<ref\b[^>]*\/>/gi, '')
		.replace(/<\/?[^>]+>/g, ' ');

	cleaned = stripNestedTemplates(cleaned);
	cleaned = decodeHtmlEntities(cleaned);

	// Replace [[File:...]] or [[Image:...]] and resolve [[Target|Label]] -> Label
	cleaned = cleaned.replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '');
	cleaned = cleaned.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
	cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');

	// External links [http://... Label] -> Label
	cleaned = cleaned.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1');
	cleaned = cleaned.replace(/\[https?:\/\/[^\]]+\]/g, '');

	// Bold/italic markup
	cleaned = cleaned.replace(/'''+/g, '').replace(/''/g, '');

	// Collapse whitespace and clean stray punctuation spacing
	cleaned = cleaned
		.replace(/\s+/g, ' ')
		.replace(/\s+([,.;:!?])/g, '$1')
		.replace(/\(\s*\)/g, '')
		.trim();

	return cleaned;
}

function extractDaySection(wikitext: string, monthName: string, day: number, year: number): string | null {
	const headerRe = new RegExp(
		`==+\\s*${monthName}\\s+${day}\\s*,\\s*${year}(?:\\s*\\([^)]*\\))?\\s*==+`,
		'i'
	);
	const match = headerRe.exec(wikitext);
	if (!match) return null;

	const afterHeader = wikitext.slice(match.index + match[0].length);
	const nextDayMatch = /\n==\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+/i.exec(
		afterHeader
	);
	const nextSectionMatch = /\n==[^=]/.exec(afterHeader);
	let endIdx = afterHeader.length;
	if (nextDayMatch) endIdx = Math.min(endIdx, nextDayMatch.index);
	if (nextSectionMatch) endIdx = Math.min(endIdx, nextSectionMatch.index);

	return afterHeader.slice(0, endIdx);
}

function parseDaySectionBullets(sectionText: string, isoDate: string): ParsedRawBullet[] {
	const lines = sectionText.split(/\r?\n/);
	const bullets: ParsedRawBullet[] = [];
	let currentSectionKind: IngestedFact['kind'] = 'event';

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith('*')) continue;

		const starMatch = trimmed.match(/^(\*+)\s*(.*)$/);
		if (!starMatch) continue;
		const depth = starMatch[1].length;
		const content = starMatch[2].trim();
		if (!content) continue;

		if (/^'''?\s*Born\s*:?\s*'''?/i.test(content)) {
			currentSectionKind = 'birth';
			const inlineBody = content.replace(/^'''?\s*Born\s*:?\s*'''?/i, '').trim();
			if (inlineBody) {
				const text = cleanWikitext(inlineBody);
				if (text.length > 8) {
					const links = extractLinkedWikiTitles(inlineBody);
					bullets.push({
						raw: inlineBody,
						kind: 'birth',
						text: text.startsWith('Born:') ? text : `Born: ${text}`,
						linkedTitles: links.titles,
						relatedEntities: links.labels,
						pressCitations: extractPressCitations(inlineBody, isoDate)
					});
				}
			}
			continue;
		}

		if (/^'''?\s*Died\s*:?\s*'''?/i.test(content)) {
			currentSectionKind = 'death';
			const inlineBody = content.replace(/^'''?\s*Died\s*:?\s*'''?/i, '').trim();
			if (inlineBody) {
				const text = cleanWikitext(inlineBody);
				if (text.length > 8) {
					const links = extractLinkedWikiTitles(inlineBody);
					bullets.push({
						raw: inlineBody,
						kind: 'death',
						text,
						linkedTitles: links.titles,
						relatedEntities: links.labels,
						pressCitations: extractPressCitations(inlineBody, isoDate)
					});
				}
			}
			continue;
		}

		// Reset to event if a single-star line appears without being inside Born/Died or if another subheader appears
		if (depth === 1 && currentSectionKind !== 'event') {
			// In Wikipedia month pages, Born/Died are followed by sub-bullets **, so a depth-1 bullet resets to event
			currentSectionKind = 'event';
		}

		const kind = depth >= 2 ? currentSectionKind : currentSectionKind === 'event' ? 'event' : currentSectionKind;
		const text = cleanWikitext(content);
		if (text.length < 12) continue;

		const links = extractLinkedWikiTitles(content);
		bullets.push({
			raw: content,
			kind,
			text: kind === 'birth' && !text.startsWith('Born:') ? `Born: ${text}` : text,
			linkedTitles: links.titles,
			relatedEntities: links.labels,
			pressCitations: extractPressCitations(content, isoDate)
		});
	}

	return bullets;
}

export function parseMonthChronicleWikitext(
	wikitext: string,
	targetYear: number,
	targetMonth: number,
	targetDay: number
): IngestedFact[] {
	const monthName = MONTH_NAMES[targetMonth - 1];
	if (!monthName || !wikitext) return [];

	const mm = String(targetMonth).padStart(2, '0');
	const dd = String(targetDay).padStart(2, '0');
	const isoDate = `${targetYear}-${mm}-${dd}`;

	const section = extractDaySection(wikitext, monthName, targetDay, targetYear);
	if (!section) return [];

	const parsedBullets = parseDaySectionBullets(section, isoDate);
	return parsedBullets.map((b) => {
		const primaryTitle = b.linkedTitles[0];
		const primaryEntity = b.relatedEntities[0] ?? primaryTitle;
		const firstCitation = b.pressCitations[0];

		const source: IngestedFact['source'] = primaryTitle
			? {
					provider: 'wikipedia',
					title: `${primaryEntity} — ${monthName} ${targetDay}, ${targetYear}`,
					url: `https://en.wikipedia.org/wiki/${encodeURIComponent(primaryTitle.replace(/ /g, '_'))}`,
					originalDate: isoDate,
					newspaper: firstCitation?.newspaper,
					excerpt: firstCitation?.headline
				}
			: {
					provider: 'wikipedia',
					title: `${monthName} ${targetYear} Historical Chronicle (${isoDate})`,
					url: `https://en.wikipedia.org/wiki/${monthName}_${targetYear}#${monthName}_${targetDay},_${targetYear}`,
					originalDate: isoDate,
					newspaper: firstCitation?.newspaper,
					excerpt: firstCitation?.headline
				};

		const category = b.kind === 'death' ? 'obituary' : inferCategoryFromText(b.text);

		return {
			kind: b.kind,
			year: targetYear,
			date: isoDate,
			text: b.text,
			source,
			category,
			relatedEntities: b.relatedEntities.length > 0 ? b.relatedEntities : undefined,
			pressCitations: b.pressCitations.length > 0 ? b.pressCitations : undefined,
			// Store internal raw wiki titles cleanly via a hidden-friendly helper or extract from source URL later
			...(b.linkedTitles.length > 0 ? { _wikiTargets: b.linkedTitles } : {})
		} as IngestedFact;
	});
}

async function fetchMonthWikitext(year: number, month: number): Promise<string | null> {
	const monthName = MONTH_NAMES[month - 1];
	if (!monthName) return null;

	const mm = String(month).padStart(2, '0');
	const cacheKey = `wiki-month/${year}-${mm}.json`;
	const cached = await getCachedJson<{ wikitext: string }>(cacheKey);
	if (cached?.wikitext) return cached.wikitext;

	const pageTitle = `${monthName}_${year}`;
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

async function fetchWikiSummary(title: string): Promise<string | null> {
	const slug = title
		.trim()
		.replace(/ /g, '_')
		.replace(/[^a-zA-Z0-9_().-]/g, '');
	if (!slug) return null;

	const cacheKey = `wiki-summary/${slug.toLowerCase()}.json`;
	const cached = await getCachedJson<{ extract: string }>(cacheKey);
	if (cached?.extract) return cached.extract;

	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.trim().replace(/ /g, '_'))}`;
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'CenturyRadio/1.0 (https://century-radio.vercel.app)',
				Accept: 'application/json'
			},
			signal: AbortSignal.timeout(2500)
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { extract?: string; type?: string };
		if (!data.extract || data.type === 'disambiguation') return null;
		const cleanExtract = data.extract.replace(/\s+/g, ' ').trim();
		if (cleanExtract.length < 40) return null;
		await setCachedJson(cacheKey, { extract: cleanExtract });
		return cleanExtract;
	} catch {
		return null;
	}
}

export async function fetchWikiChronicle(isoDate: string): Promise<IngestedFact[]> {
	const [year, month, day] = isoDate.split('-').map(Number);
	if (!year || !month || !day) return [];

	const prev1 = new Date(Date.UTC(year, month - 1, day - 1));
	const prev2 = new Date(Date.UTC(year, month - 1, day - 2));

	// Determine unique (year, month) pages needed
	const monthKeys = new Map<string, { year: number; month: number }>();
	for (const d of [new Date(Date.UTC(year, month - 1, day)), prev1, prev2]) {
		const y = d.getUTCFullYear();
		const m = d.getUTCMonth() + 1;
		monthKeys.set(`${y}-${m}`, { year: y, month: m });
	}

	const wikitextMap = new Map<string, string | null>();
	await Promise.all(
		Array.from(monthKeys.entries()).map(async ([k, { year: y, month: m }]) => {
			wikitextMap.set(k, await fetchMonthWikitext(y, m));
		})
	);

	const targetWikitext = wikitextMap.get(`${year}-${month}`) ?? '';
	const exactFacts = parseMonthChronicleWikitext(targetWikitext, year, month, day);

	const prev1Wikitext = wikitextMap.get(`${prev1.getUTCFullYear()}-${prev1.getUTCMonth() + 1}`) ?? '';
	const prev2Wikitext = wikitextMap.get(`${prev2.getUTCFullYear()}-${prev2.getUTCMonth() + 1}`) ?? '';

	const prev1Facts = parseMonthChronicleWikitext(
		prev1Wikitext,
		prev1.getUTCFullYear(),
		prev1.getUTCMonth() + 1,
		prev1.getUTCDate()
	)
		.filter((f) => f.kind === 'event')
		.slice(0, 3)
		.map((f) => ({ ...f, category: 'developing_wire' }));

	const prev2Facts = parseMonthChronicleWikitext(
		prev2Wikitext,
		prev2.getUTCFullYear(),
		prev2.getUTCMonth() + 1,
		prev2.getUTCDate()
	)
		.filter((f) => f.kind === 'event')
		.slice(0, 2)
		.map((f) => ({ ...f, category: 'developing_wire' }));

	// Enrich top 4 linked articles from exact-day events & deaths concurrently
	const enrichmentQueue: Array<{ fact: IngestedFact; wikiTitle: string }> = [];
	const seenWikiTitles = new Set<string>();
	const prioritizedFacts = [
		...exactFacts.filter((f) => f.kind === 'event'),
		...exactFacts.filter((f) => f.kind === 'death'),
		...prev1Facts
	];

	for (const fact of prioritizedFacts) {
		const targets = ((fact as IngestedFact & { _wikiTargets?: string[] })._wikiTargets ?? []);
		for (const target of targets) {
			if (seenWikiTitles.has(target) || enrichmentQueue.length >= 4) continue;
			seenWikiTitles.add(target);
			enrichmentQueue.push({ fact, wikiTitle: target });
			break;
		}
	}

	await Promise.all(
		enrichmentQueue.map(async ({ fact, wikiTitle }) => {
			const extract = await fetchWikiSummary(wikiTitle);
			if (extract && !fact.text.includes(extract.slice(0, 40))) {
				fact.detailedContext = extract;
			}
		})
	);

	// Clean internal helper property before returning
	const combined = [...exactFacts, ...prev1Facts, ...prev2Facts].map((f) => {
		const copy = { ...(f as IngestedFact & { _wikiTargets?: string[] }) };
		delete copy._wikiTargets;
		return copy as IngestedFact;
	});

	return combined;
}
