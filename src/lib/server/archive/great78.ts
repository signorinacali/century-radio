import catalog from '$lib/data/music-catalog.json';
import { getCachedJson, setCachedJson } from '$lib/server/cache/blobCache';
import type { ArchiveTrack, MoodTag, TrackCategory } from '$lib/types/broadcast';

const ALL_TRACKS = catalog as ArchiveTrack[];

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

export function getCatalogTracks(maxYear = 1926, category?: TrackCategory): ArchiveTrack[] {
	const yearFiltered = ALL_TRACKS.filter((t) => t.year <= maxYear);
	const base = yearFiltered.length > 0 ? yearFiltered : ALL_TRACKS;
	if (!category) return base;
	const catFiltered = base.filter((t) => t.category === category);
	return catFiltered.length > 0 ? catFiltered : base;
}

export function pickTrackForBroadcast(
	targetYear: number,
	desiredMoods: MoodTag[] = ['jazz'],
	seed = '1926-11-15',
	excludeIds?: Set<string>,
	category?: TrackCategory
): ArchiveTrack {
	let eligible = getCatalogTracks(targetYear, category);
	if (excludeIds && excludeIds.size > 0) {
		const nonExcluded = eligible.filter((t) => !excludeIds.has(t.identifier));
		if (nonExcluded.length > 0) {
			eligible = nonExcluded;
		} else if (category) {
			// Fall back to any non-excluded eligible track across categories before repeating
			const anyCategory = getCatalogTracks(targetYear).filter((t) => !excludeIds.has(t.identifier));
			if (anyCategory.length > 0) {
				eligible = anyCategory;
			}
		}
	}

	const moodMatches = eligible.filter((t) => t.moodTags.some((m) => desiredMoods.includes(m)));
	const pool = moodMatches.length > 0 ? moodMatches : eligible;

	const hash = hashSeed(seed);
	return pool[hash % pool.length];
}

export function getPlaylistForDate(targetYear: number, isoDate: string): ArchiveTrack[] {
	const eligible = [...getCatalogTracks(targetYear)];
	let state = hashSeed(`${isoDate}-${targetYear}-kfox78`) || 1;
	// Deterministic seeded Fisher-Yates shuffle
	for (let i = eligible.length - 1; i > 0; i--) {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		const j = state % (i + 1);
		const tmp = eligible[i];
		eligible[i] = eligible[j];
		eligible[j] = tmp;
	}
	return eligible;
}

interface ArchiveMetadataFile {
	name?: string;
	format?: string;
}

interface ArchiveMetadataResponse {
	files?: ArchiveMetadataFile[];
}

function buildDownloadUrl(identifier: string, filePath: string): string {
	const encodedPath = filePath
		.split('/')
		.filter((part) => part.length > 0)
		.map((part) => encodeURIComponent(part))
		.join('/');
	return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedPath}`;
}

export async function resolveArchiveMp3Url(identifier: string): Promise<string | null> {
	const localHit = ALL_TRACKS.find((t) => t.identifier === identifier);
	if (localHit?.mp3File) {
		return buildDownloadUrl(identifier, localHit.mp3File);
	}

	const cacheKey = `archive-meta/${identifier}.json`;
	const cached = await getCachedJson<{ url: string }>(cacheKey);
	if (cached?.url) return cached.url;

	try {
		const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
			headers: { 'User-Agent': 'CenturyRadio/1.0', Accept: 'application/json' },
			signal: AbortSignal.timeout(8000)
		});
		if (!res.ok) return null;

		const data = (await res.json()) as ArchiveMetadataResponse;
		const mp3s = (data.files ?? []).filter((f) => f.name && f.name.toLowerCase().endsWith('.mp3'));
		const mp3File =
			mp3s.find((f) => f.format === 'VBR MP3' && !f.name!.endsWith('_64kb.mp3')) ??
			mp3s.find((f) => !f.name!.endsWith('_64kb.mp3')) ??
			mp3s[0];
		if (!mp3File?.name) return null;

		const url = buildDownloadUrl(identifier, mp3File.name);
		await setCachedJson(cacheKey, { url });
		return url;
	} catch {
		return null;
	}
}
