import { env } from '$env/dynamic/private';
import type { SegmentType } from '$lib/types/broadcast';

const MAX_CHUNK_CHARS = 340;

export const VOICE_APOLLO = 'aura-2-apollo-en';
export const VOICE_ORION = 'aura-2-orion-en';
export const VOICE_ASTERIA = 'aura-2-asteria-en';
export const VOICE_ATHENA = 'aura-2-athena-en';

export interface DialogueTurn {
	speaker: string;
	voiceModel: string;
	text: string;
}

export function getVoiceForSegment(type: SegmentType): string {
	switch (type) {
		case 'VINTAGE_AD':
			return VOICE_ASTERIA;
		case 'WEATHER_REPORT':
		case 'SCIENCE_AND_AVIATION':
			return VOICE_ATHENA;
		case 'MARKET_REPORT':
		case 'SPORTS_ROUNDUP':
		case 'COMEDY_SKETCH':
		case 'VARIETY_HOUR':
			return VOICE_ORION;
		case 'STATION_ID':
		case 'NEWS_BULLETIN':
		case 'FEATURE_STORY':
		case 'FIRESIDE_EDITORIAL':
		case 'OBITUARY_WIRE':
		case 'CONCERT_HALL':
		case 'RADIO_DRAMA':
		case 'MUSIC_INTERLUDE':
		case 'TIME_SIGNAL':
		default:
			return VOICE_APOLLO;
	}
}

export function getSpeakerLabelForSegment(type: SegmentType, isMultiVoice = false): string {
	if (isMultiVoice || type === 'RADIO_DRAMA') {
		return 'Dramatic Repertory Cast (Multi-Voice)';
	}
	switch (type) {
		case 'VINTAGE_AD':
			return 'Clara Vance · Commercial Desk';
		case 'WEATHER_REPORT':
			return 'Evelyn Shaw · Weather Bureau';
		case 'SCIENCE_AND_AVIATION':
			return 'Evelyn Shaw · Science & Air Desk';
		case 'MARKET_REPORT':
			return 'Grant Sterling · Financial Ticker';
		case 'SPORTS_ROUNDUP':
			return 'Grant Sterling · Sports & Stage';
		case 'COMEDY_SKETCH':
		case 'VARIETY_HOUR':
			return 'Grant Sterling · Variety Host + 78rpm';
		case 'CONCERT_HALL':
			return 'Arthur Pendelton · Concert Master';
		case 'MUSIC_INTERLUDE':
			return 'Arthur Pendelton · Studio Victrola';
		case 'OBITUARY_WIRE':
			return 'Arthur Pendelton · Telegraph Notices';
		case 'FEATURE_STORY':
			return 'Arthur Pendelton · Special Correspondent';
		case 'FIRESIDE_EDITORIAL':
			return 'Arthur Pendelton · Evening Editorial';
		case 'STATION_ID':
		case 'NEWS_BULLETIN':
		default:
			return 'Arthur Pendelton · Senior Newsman';
	}
}

function mapSpeakerNameToVoice(speakerName: string, fallbackVoice: string): string {
	const upper = speakerName.toUpperCase().trim();
	if (/^(CLARA|ELEANOR|MARGARET|BEATRICE|HELEN|LOUISE|RUTH|LADY|WOMAN|MISS)/.test(upper)) {
		return VOICE_ASTERIA;
	}
	if (/^(REPORTER|CORRESPONDENT|METEOROLOGIST|DOCTOR|PROFESSOR|OPERATOR|ATHENA|EVELYN)/.test(upper)) {
		return VOICE_ATHENA;
	}
	if (/^(INSPECTOR|DETECTIVE|CAPTAIN|HAROLD|JACK|BILLY|ORION|GRANT|VILLAIN|SHERIFF)/.test(upper)) {
		return VOICE_ORION;
	}
	if (/^(ANNOUNCER|HOST|NARRATOR|ARTHUR|APOLLO)/.test(upper)) {
		return VOICE_APOLLO;
	}
	return fallbackVoice;
}

/**
 * Splits a multi-speaker radio drama or dialogue script into ordered speaker turns.
 * Paragraphs starting with `SPEAKER:` (e.g. `CLARA: Look at the wire...`) are routed
 * to distinct Deepgram Aura-2 cast voices with the speaker cue stripped from spoken audio.
 */
export function parseDialogueTurns(scriptText: string, defaultVoice = VOICE_APOLLO): DialogueTurn[] {
	const paragraphs = scriptText
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);

	if (paragraphs.length === 0) return [];

	const cuePattern = /^([A-Z][A-Z0-9 .'-]{1,22}):\s+([\s\S]+)$/;
	const rawTurns: DialogueTurn[] = [];
	let hasAnyCue = false;

	for (const para of paragraphs) {
		const match = para.match(cuePattern);
		if (match) {
			hasAnyCue = true;
			const speaker = match[1].trim();
			const spoken = match[2].trim();
			if (spoken) {
				rawTurns.push({
					speaker,
					voiceModel: mapSpeakerNameToVoice(speaker, defaultVoice),
					text: spoken
				});
			}
		} else {
			rawTurns.push({
				speaker: 'NARRATOR',
				voiceModel: defaultVoice,
				text: para
			});
		}
	}

	if (!hasAnyCue) {
		return [{ speaker: 'NARRATOR', voiceModel: defaultVoice, text: scriptText.trim() }];
	}

	// Merge consecutive turns sharing the exact same voiceModel to minimize API round-trips
	const merged: DialogueTurn[] = [];
	for (const turn of rawTurns) {
		const prev = merged[merged.length - 1];
		if (prev && prev.voiceModel === turn.voiceModel) {
			prev.text = `${prev.text}\n\n${turn.text}`;
		} else {
			merged.push({ ...turn });
		}
	}
	return merged;
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

	const paragraphs = raw
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
	const chunks: string[] = [];
	let currentChunk = '';

	const pushSentence = (sentence: string) => {
		const s = sentence.trim();
		if (!s) return;

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
		if ((currentChunk ? `${currentChunk}\n\n${para}` : para).length <= maxChars) {
			currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
		} else {
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

class NonRetryableTtsError extends Error {}

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
			const msg = `Deepgram TTS failed (${res.status}): ${errText.slice(0, 200)}`;
			if (res.status >= 400 && res.status < 500 && res.status !== 429) {
				throw new NonRetryableTtsError(msg);
			}
			throw new Error(msg);
		}

		return new Uint8Array(await res.arrayBuffer());
	} catch (err) {
		if (err instanceof NonRetryableTtsError) {
			throw err;
		}
		if (retryCount < 2) {
			await new Promise((r) => setTimeout(r, 600 * (retryCount + 1)));
			return fetchDeepgramChunk(chunk, model, apiKey, retryCount + 1);
		}
		throw err;
	}
}

function concatMp3Buffers(buffers: Uint8Array[]): Uint8Array {
	if (buffers.length === 0) return new Uint8Array(0);
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

export async function synthesizeDeepgramSpeech(
	text: string,
	model = VOICE_APOLLO
): Promise<Uint8Array> {
	const apiKey = env.DEEPGRAM_API_KEY?.trim() || process.env.DEEPGRAM_API_KEY?.trim();
	if (!apiKey) {
		throw new Error('DEEPGRAM_API_KEY is not configured');
	}

	const chunks = splitScriptIntoChunks(text);
	if (chunks.length === 0) {
		return new Uint8Array(0);
	}

	const buffers = await pMap(chunks, (chunk) => fetchDeepgramChunk(chunk, model, apiKey), 5);
	return concatMp3Buffers(buffers);
}

export async function synthesizeBroadcastScript(
	scriptText: string,
	defaultVoice = VOICE_APOLLO
): Promise<Uint8Array> {
	const apiKey = env.DEEPGRAM_API_KEY?.trim() || process.env.DEEPGRAM_API_KEY?.trim();
	if (!apiKey) {
		throw new Error('DEEPGRAM_API_KEY is not configured');
	}

	const turns = parseDialogueTurns(scriptText, defaultVoice);
	if (turns.length === 0) {
		return new Uint8Array(0);
	}

	const items: Array<{ text: string; voiceModel: string }> = [];
	for (const turn of turns) {
		for (const chunk of splitScriptIntoChunks(turn.text)) {
			items.push({ text: chunk, voiceModel: turn.voiceModel });
		}
	}

	const buffers = await pMap(
		items,
		(item) => fetchDeepgramChunk(item.text, item.voiceModel, apiKey),
		5
	);
	return concatMp3Buffers(buffers);
}
