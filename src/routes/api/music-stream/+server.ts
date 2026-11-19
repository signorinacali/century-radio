import { json } from '@sveltejs/kit';
import { computeCenturyDate } from '$lib/data/sampleBroadcast';
import { getPlaylistForDate } from '$lib/server/archive/great78';
import { isValidIsoDate } from '$lib/server/broadcastService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const dateParam = url.searchParams.get('date') ?? computeCenturyDate(0, 100);
	const date = isValidIsoDate(dateParam) ? dateParam : computeCenturyDate(0, 100);

	const yearParam = Number(url.searchParams.get('year'));
	const parsedDateYear = Number(date.slice(0, 4)) || 1926;
	const year = Number.isFinite(yearParam) && yearParam >= 1919 && yearParam <= 1927 ? yearParam : parsedDateYear;

	const rawTracks = getPlaylistForDate(year, date);
	let offsetSec = 0;
	const tracks = rawTracks.map((t) => {
		const entry = {
			...t,
			scheduledOffsetSec: offsetSec,
			audioUrl: `/api/archive-audio?id=${encodeURIComponent(t.identifier)}`,
			archiveUrl: `https://archive.org/details/${encodeURIComponent(t.identifier)}`
		};
		offsetSec += t.durationSec;
		return entry;
	});

	return json(
		{
			year,
			date,
			totalDurationSec: offsetSec,
			tracks
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
			}
		}
	);
};
