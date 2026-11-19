import type { Config } from '@sveltejs/adapter-vercel';
import { error } from '@sveltejs/kit';
import {
	getOrCreateBroadcastDay,
	isValidIsoDate,
	normalizeStationId
} from '$lib/server/broadcastService';
import { getCachedAudio, setCachedAudio } from '$lib/server/cache/blobCache';
import {
	synthesizeBroadcastScript,
	synthesizeDeepgramSpeech,
	VOICE_APOLLO
} from '$lib/server/tts/deepgram';
import type { RequestHandler } from './$types';

export const config: Config = {
	maxDuration: 60
};

export const GET: RequestHandler = async ({ url }) => {
	const date = url.searchParams.get('date') ?? '';
	const segmentId = url.searchParams.get('segment') ?? '';
	const stationId = normalizeStationId(url.searchParams.get('station'));
	const part = url.searchParams.get('part') === 'intro' ? 'intro' : 'main';

	if (!isValidIsoDate(date) || !segmentId) {
		throw error(400, 'Missing or invalid date/segment parameter');
	}

	const suffix = part === 'intro' ? '-intro' : '';
	const cacheKey = `tts/v3/${stationId}/${date}/${segmentId}${suffix}.mp3`;
	const cached = await getCachedAudio(cacheKey);
	if (cached) {
		return new Response(Buffer.from(cached), {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=86400, immutable'
			}
		});
	}

	const day = await getOrCreateBroadcastDay(date, stationId);
	const segment = day.segments.find((s) => s.id === segmentId);
	if (!segment) {
		throw error(404, 'Broadcast segment not found');
	}

	const textToSpeak = part === 'intro' ? segment.introText : segment.scriptText;
	if (!textToSpeak || !textToSpeak.trim()) {
		throw error(404, 'No spoken text found for requested broadcast segment part');
	}

	try {
		const audioBytes =
			part === 'intro'
				? await synthesizeDeepgramSpeech(textToSpeak, VOICE_APOLLO)
				: await synthesizeBroadcastScript(textToSpeak, segment.audio.voiceModel ?? VOICE_APOLLO);

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
