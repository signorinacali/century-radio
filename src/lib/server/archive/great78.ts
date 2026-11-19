import catalog from '$lib/data/music-catalog.json';
import { getCachedJson, setCachedJson } from '$lib/server/cache/blobCache';
import type { MoodTag } from '$lib/types/broadcast';

export interface ArchiveTrack {
	identifier: string;
	title: string;
	creator: string;
	year: number;
	durationSec: number;
	moodTags: MoodTag[];
}

const ALL_TRACKS = catalog as ArchiveTrack[];

export function getCatalogTracks(maxYear = 1926): ArchiveTrack[] {
	const filtered = ALL_TRACKS.filter((t) => t.year <= maxYear);
	return filtered.length > 0 ? filtered : ALL_TRACKS;
}

export function pickTrackForBroadcast(
	targetYear: number,
	desiredMoods: MoodTag[] = ['jazz'],
	seed = '1926-11-15'
): ArchiveTrack {
	const eligible = getCatalogTracks(targetYear);
	const moodMatches = eligible.filter((t) => t.moodTags.some((m) => desiredMoods.includes(m)));
	const pool = moodMatches.length > 0 ? moodMatches : eligible;

	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return pool[hash % pool.length];
}

interface ArchiveMetadataFile {
	name?: string;
	format?: string;
}

interface ArchiveMetadataResponse {
	files?: ArchiveMetadataFile[];
}

export async function resolveArchiveMp3Url(identifier: string): Promise<string | null> {
	const cacheKey = `archive-meta/${identifier}.json`;
	const cached = await getCachedJson<{ url: string }>(cacheKey);
	if (cached?.url) return cached.url;

	try {
		const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
			headers: { 'User-Agent': 'CenturyRadio/1.0', Accept: 'application/json' },
			signal: AbortSignal.timeout(5000)
		});
		if (!res.ok) return null;

		const data = (await res.json()) as ArchiveMetadataResponse;
		const mp3File = data.files?.find(
			(f) => f.name && (f.name.endsWith('.mp3') || f.format === 'VBR MP3' || f.format === '128Kbps MP3')
		);
		if (!mp3File?.name) return null;

		const url = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(
			mp3File.name
		)}`;
		await setCachedJson(cacheKey, { url });
		return url;
	} catch {
		return null;
	}
}
