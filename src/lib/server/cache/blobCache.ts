import { env } from '$env/dynamic/private';
import { head, put } from '@vercel/blob';

const memoryJsonCache = new Map<string, string>();
const memoryBinaryCache = new Map<string, Uint8Array>();

function hasBlobToken(): boolean {
	return Boolean(env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
	const mem = memoryJsonCache.get(key);
	if (mem) {
		return JSON.parse(mem) as T;
	}
	if (!hasBlobToken()) return null;

	try {
		const meta = await head(key, { token: env.BLOB_READ_WRITE_TOKEN });
		const res = await fetch(meta.url);
		if (!res.ok) return null;
		const text = await res.text();
		memoryJsonCache.set(key, text);
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

export async function setCachedJson<T>(key: string, value: T): Promise<void> {
	const text = JSON.stringify(value);
	memoryJsonCache.set(key, text);
	if (!hasBlobToken()) return;

	try {
		await put(key, text, {
			access: 'public',
			contentType: 'application/json',
			addRandomSuffix: false,
			token: env.BLOB_READ_WRITE_TOKEN
		});
	} catch {
		// Non-fatal: in-memory cache still holds the payload for this instance
	}
}

export async function getCachedAudio(key: string): Promise<Uint8Array | null> {
	const mem = memoryBinaryCache.get(key);
	if (mem) return mem;
	if (!hasBlobToken()) return null;

	try {
		const meta = await head(key, { token: env.BLOB_READ_WRITE_TOKEN });
		const res = await fetch(meta.url);
		if (!res.ok) return null;
		const bytes = new Uint8Array(await res.arrayBuffer());
		memoryBinaryCache.set(key, bytes);
		return bytes;
	} catch {
		return null;
	}
}

export async function setCachedAudio(key: string, bytes: Uint8Array, contentType = 'audio/mpeg'): Promise<void> {
	memoryBinaryCache.set(key, bytes);
	if (!hasBlobToken()) return;

	try {
		await put(key, Buffer.from(bytes), {
			access: 'public',
			contentType,
			addRandomSuffix: false,
			token: env.BLOB_READ_WRITE_TOKEN
		});
	} catch {
		// Non-fatal
	}
}
