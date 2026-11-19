import { json } from '@sveltejs/kit';
import { computeCenturyDate } from '$lib/data/sampleBroadcast';
import { getOrCreateBroadcastDay, isValidIsoDate } from '$lib/server/broadcastService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const dateParam = url.searchParams.get('date') ?? computeCenturyDate(0, 100);
	if (!isValidIsoDate(dateParam)) {
		return json({ error: 'Invalid date parameter. Expected YYYY-MM-DD.' }, { status: 400 });
	}

	const broadcast = await getOrCreateBroadcastDay(dateParam);
	return json(broadcast, {
		headers: {
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
		}
	});
};
