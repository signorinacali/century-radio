import { env } from '$env/dynamic/private';
import type { SegmentType } from '$lib/types/broadcast';

const MAX_CHUNK_CHARS = 1600;

export function getVoiceForSegment(type: SegmentType): string {
	switch (type) {
		case 'VINTAGE_AD':
			return 'aura-2-asteria-en';
		case 'WEATHER_REPORT':
		case 'SCIENCE_AND_AVIATION':
			return 'aura-2-athena-en';
		case 'MARKET_REPORT':
		case 'SPORTS_ROUNDUP':
			return 'aura-2-orion-en';
		case 'STATION_ID':
		case 'NEWS_BULLETIN':
		case 'FEATURE_STORY':
		case 'FIRESIDE_EDITORIAL':
		case 'TIME_SIGNAL':
		default:
			return 'aura-2-apollo-en';
	}
}

/**
 * Robust sentence-boundary script chunker for Deepgram TTS.
 * Splits on paragraphs (\n\n) and sentence terminals (. ! ? —) without
 * truncating words or splitting in the middle of sentences.
 */
export function splitScriptIntoChunks(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
	const raw = text.trim();
	if (!raw) return [];
	if (raw.length <= maxChars) return [raw];

	const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
	const chunks: string[] = [];
	let currentChunk = '';

	const pushSentence = (sentence: string) => {
		const s = sentence.trim();
		if (!s) return;

		// If a single sentence exceeds maxChars, split on clauses or word boundaries
		if (s.length > maxChars) {
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}
			const clauses = s.split(/(?<=[,;:])\s+/);
			let clauseAccum = '';
			for (const clause of clauses) {
				if ((clauseAccum + ' ' + clause).trim().length > maxChars) {
					if (clauseAccum) chunks.push(clauseAccum.trim());
					clauseAccum = clause;
				} else {
					clauseAccum = clauseAccum ? `${clauseAccum} ${clause}` : clause;
				}
			}
			if (clauseAccum) chunks.push(clauseAccum.trim());
			return;
		}

		if ((currentChunk + ' ' + s).trim().length > maxChars) {
			if (currentChunk) chunks.push(currentChunk.trim());
			currentChunk = s;
		} else {
			currentChunk = currentChunk ? `${currentChunk} ${s}` : s;
		}
	};

	for (const para of paragraphs) {
		// If adding the entire paragraph fits comfortably
		if ((currentChunk ? `${currentChunk}\n\n${para}` : para).length <= maxChars) {
			currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
		} else {
			// Split paragraph into individual sentences
			const sentences = para.split(/(?<=[.!?—])\s+/);
			for (const sent of sentences) {
				pushSentence(sent);
			}
		}
	}

	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}

export function chunkTextForTts(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
	return splitScriptIntoChunks(text, maxChars);
}

/**
 * Strips ID3v2 container headers from concatenated MP3 buffers
 * so stitched streams transition smoothly without player clicks or bursts.
 */
export function stripId3Header(buffer: Uint8Array): Uint8Array {
	if (buffer.length > 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
		const size =
			((buffer[6] & 0x7f) << 21) |
			((buffer[7] & 0x7f) << 14) |
			((buffer[8] & 0x7f) << 7) |
			(buffer[9] & 0x7f);
		const totalHeaderLength = 10 + size;
		if (buffer.length > totalHeaderLength) {
			return buffer.subarray(totalHeaderLength);
		}
	}
	return buffer;
}

async function pMap<T, R>(
	items: T[],
	fn: (item: T, index: number) => Promise<R>,
	concurrency = 3
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let nextIndex = 0;

	const worker = async () => {
		while (nextIndex < items.length) {
			const idx = nextIndex++;
			results[idx] = await fn(items[idx], idx);
		}
	};

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
	await Promise.all(workers);
	return results;
}

async function fetchDeepgramChunk(
	chunk: string,
	model: string,
	apiKey: string,
	retryCount = 0
): Promise<Uint8Array> {
	try {
		const res = await fetch(
			`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
			{
				method: 'POST',
				headers: {
					Authorization: `Token ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ text: chunk }),
				signal: AbortSignal.timeout(20000)
			}
		);

		if (!res.ok) {
			const errText = await res.text().catch(() => '');
			if ((res.status === 429 || res.status >= 500) && retryCount < 2) {
				await new Promise((r) => setTimeout(r, 600 * (retryCount + 1)));
				return fetchDeepgramChunk(chunk, model, apiKey, retryCount + 1);
			}
			throw new Error(`Deepgram TTS failed (${res.status}): ${errText.slice(0, 200)}`);
		}

		return new Uint8Array(await res.arrayBuffer());
	} catch (err) {
		if (retryCount < 2) {
			await new Promise((r) => setTimeout(r, 600 * (retryCount + 1)));
			return fetchDeepgramChunk(chunk, model, apiKey, retryCount + 1);
		}
		throw err;
	}
}

export async function synthesizeDeepgramSpeech(
	text: string,
	model = 'aura-2-apollo-en'
): Promise<Uint8Array> {
	const apiKey = env.DEEPGRAM_API_KEY?.trim() || process.env.DEEPGRAM_API_KEY?.trim();
	if (!apiKey) {
		throw new Error('DEEPGRAM_API_KEY is not configured');
	}

	const chunks = splitScriptIntoChunks(text);
	if (chunks.length === 0) {
		return new Uint8Array(0);
	}

	// Synthesize chunks in parallel with concurrency limit
	const buffers = await pMap(chunks, (chunk) => fetchDeepgramChunk(chunk, model, apiKey), 3);

	// Concatenate MP3 frames, stripping ID3 header from chunks 1..N
	const cleanedBuffers = buffers.map((buf, i) => (i === 0 ? buf : stripId3Header(buf)));
	const totalLen = cleanedBuffers.reduce((sum, b) => sum + b.length, 0);
	const merged = new Uint8Array(totalLen);
	let offset = 0;
	for (const b of cleanedBuffers) {
		merged.set(b, offset);
		offset += b.length;
	}
	return merged;
}
