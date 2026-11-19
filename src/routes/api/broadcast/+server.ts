import type { Config } from '@sveltejs/adapter-vercel';
import { json } from '@sveltejs/kit';
import { computeCenturyDate } from '$lib/data/sampleBroadcast';
import {
	getOrCreateBroadcastDay,
	isValidIsoDate,
	normalizeStationId
} from '$lib/server/broadcastService';
import type { RequestHandler } from './$types';

export const config: Config = {
	maxDuration: 60
};

export const GET: RequestHandler = async ({ url }) => {
	const dateParam = url.searchParams.get('date') ?? computeCenturyDate(0, 100);
	if (!isValidIsoDate(dateParam)) {
		return json({ error: 'Invalid date parameter. Expected YYYY-MM-DD.' }, { status: 400 });
	}

	const stationId = normalizeStationId(url.searchParams.get('station'));
	const broadcast = await getOrCreateBroadcastDay(dateParam, stationId);
	return json(broadcast, {
		headers: {
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
		}
	});
};
