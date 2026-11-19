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

	const [todayDay, tomorrowDay] = await Promise.all([
		getOrCreateBroadcastDay(todayCentury),
		getOrCreateBroadcastDay(tomorrowCentury)
	]);

	return json({
		ok: true,
		prewarmed: [todayDay.id, tomorrowDay.id]
	});
};
