import { getCachedJson, setCachedJson } from '$lib/server/cache/blobCache';
import { ingestHistoricalFacts } from '$lib/server/history/ingest';
import { generateBroadcastDay } from '$lib/server/llm/scriptGenerator';
import type { BroadcastDay } from '$lib/types/broadcast';

export function isValidIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function getOrCreateBroadcastDay(isoDate: string): Promise<BroadcastDay> {
	const cacheKey = `broadcasts/${isoDate}.v2.json`;
	const cached = await getCachedJson<BroadcastDay>(cacheKey);
	if (cached) {
		return cached;
	}

	const facts = await ingestHistoricalFacts(isoDate);
	const broadcast = await generateBroadcastDay(isoDate, facts);
	await setCachedJson(cacheKey, broadcast);
	return broadcast;
}
