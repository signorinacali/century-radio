import { error } from '@sveltejs/kit';
import { resolveArchiveMp3Url } from '$lib/server/archive/great78';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
	const id = url.searchParams.get('id')?.trim();
	if (!id || !/^[a-zA-Z0-9_.-]+$/.test(id)) {
		throw error(400, 'Invalid Internet Archive identifier');
	}

	const mp3Url = await resolveArchiveMp3Url(id);
	if (!mp3Url) {
		throw error(404, 'No MP3 derivative found for this Great 78 Project item');
	}

	const headers: Record<string, string> = {
		'User-Agent': 'CenturyRadio/1.0'
	};
	const range = request.headers.get('range');
	if (range) {
		headers['Range'] = range;
	}

	try {
		const upstream = await fetch(mp3Url, {
			headers,
			signal: AbortSignal.timeout(12000)
		});
		if (!upstream.ok && upstream.status !== 206) {
			throw error(502, `Internet Archive returned ${upstream.status}`);
		}

		const resHeaders = new Headers({
			'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
			'Cache-Control': 'public, max-age=86400',
			'Accept-Ranges': 'bytes'
		});
		const contentLength = upstream.headers.get('content-length');
		if (contentLength) resHeaders.set('Content-Length', contentLength);
		const contentRange = upstream.headers.get('content-range');
		if (contentRange) resHeaders.set('Content-Range', contentRange);

		return new Response(upstream.body, {
			status: upstream.status,
			headers: resHeaders
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(503, 'Internet Archive audio stream unavailable');
	}
};
