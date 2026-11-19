import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { computeCenturyDate } from '$lib/data/sampleBroadcast';
import { getOrCreateBroadcastDay } from '$lib/server/broadcastService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET?.trim();
	if (secret) {
		const auth = request.headers.get('authorization');
		if (auth !== `Bearer ${secret}`) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	const todayCentury = computeCenturyDate(0, 100);
	const tomorrowCentury = computeCenturyDate(1, 100);

	const [todayWcrn, todayWgn, tomorrowWcrn, tomorrowWgn] = await Promise.all([
		getOrCreateBroadcastDay(todayCentury, 'wcrn'),
		getOrCreateBroadcastDay(todayCentury, 'wgn'),
		getOrCreateBroadcastDay(tomorrowCentury, 'wcrn'),
		getOrCreateBroadcastDay(tomorrowCentury, 'wgn')
	]);

	return json({
		ok: true,
		prewarmed: [
			`${todayWcrn.stationId}:${todayWcrn.id}`,
			`${todayWgn.stationId}:${todayWgn.id}`,
			`${tomorrowWcrn.stationId}:${tomorrowWcrn.id}`,
			`${tomorrowWgn.stationId}:${tomorrowWgn.id}`
		]
	});
};
