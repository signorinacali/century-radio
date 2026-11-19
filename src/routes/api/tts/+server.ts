import { error } from '@sveltejs/kit';
import { getOrCreateBroadcastDay, isValidIsoDate } from '$lib/server/broadcastService';
import { getCachedAudio, setCachedAudio } from '$lib/server/cache/blobCache';
import { synthesizeDeepgramSpeech } from '$lib/server/tts/deepgram';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const date = url.searchParams.get('date') ?? '';
	const segmentId = url.searchParams.get('segment') ?? '';

	if (!isValidIsoDate(date) || !segmentId) {
		throw error(400, 'Missing or invalid date/segment parameter');
	}

	const cacheKey = `tts/v2/${date}/${segmentId}.mp3`;
	const cached = await getCachedAudio(cacheKey);
	if (cached) {
		return new Response(Buffer.from(cached), {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=86400, immutable'
			}
		});
	}

	const day = await getOrCreateBroadcastDay(date);
	const segment = day.segments.find((s) => s.id === segmentId);
	if (!segment || !segment.scriptText) {
		throw error(404, 'Broadcast segment not found');
	}

	try {
		const audioBytes = await synthesizeDeepgramSpeech(segment.scriptText, segment.audio.voiceModel);
		await setCachedAudio(cacheKey, audioBytes, 'audio/mpeg');

		return new Response(Buffer.from(audioBytes), {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=86400, immutable'
			}
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'TTS synthesis unavailable';
		throw error(503, message);
	}
};
