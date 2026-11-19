import { getCachedJson, setCachedJson } from '$lib/server/cache/blobCache';
import { ingestHistoricalFacts } from '$lib/server/history/ingest';
import { generateBroadcastDay } from '$lib/server/llm/scriptGenerator';
import type { BroadcastDay, StationId } from '$lib/types/broadcast';

const inFlightBroadcasts = new Map<string, Promise<BroadcastDay>>();

export function isValidIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeStationId(value: string | null | undefined): StationId {
	return value === 'wgn' ? 'wgn' : 'wcrn';
}

export async function getOrCreateBroadcastDay(
	isoDate: string,
	stationId: StationId = 'wcrn'
): Promise<BroadcastDay> {
	const station = normalizeStationId(stationId);
	const cacheKey = `broadcasts/${station}/${isoDate}.v3.json`;
	const cached = await getCachedJson<BroadcastDay>(cacheKey);
	if (cached) {
		return cached;
	}

	const existing = inFlightBroadcasts.get(cacheKey);
	if (existing) {
		return existing;
	}

	const job = (async () => {
		const facts = await ingestHistoricalFacts(isoDate);
		const broadcast = await generateBroadcastDay(isoDate, facts, station);
		await setCachedJson(cacheKey, broadcast);
		return broadcast;
	})().finally(() => {
		inFlightBroadcasts.delete(cacheKey);
	});

	inFlightBroadcasts.set(cacheKey, job);
	return job;
}
