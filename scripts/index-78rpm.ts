/**
 * Maintenance script to populate src/lib/data/music-catalog.json from
 * the Internet Archive Great 78 Project (collection:georgeblood) with
 * verified playable MP3 derivatives across music and 1920s comedy/vaudeville.
 *
 * Run with Node 22+:
 *   node --experimental-strip-types scripts/index-78rpm.ts
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ArchiveTrack, MoodTag, TrackCategory } from '../src/lib/types/broadcast.ts';

interface IaDoc {
	identifier: string;
	title?: string | string[];
	creator?: string | string[];
	year?: string | number;
	subject?: string | string[];
}

interface IaMetaFile {
	name?: string;
	format?: string;
	length?: string | number;
}

interface BucketConfig {
	category: TrackCategory;
	query: string;
	targetCount: number;
	rows: number;
	defaultMoods: MoodTag[];
}

const BUCKETS: BucketConfig[] = [
	{
		category: 'jazz',
		query:
			'collection:georgeblood AND year:[1919 TO 1927] AND mediatype:audio AND (subject:"Jazz" OR subject:"Fox Trot" OR subject:"Ragtime")',
		targetCount: 18,
		rows: 60,
		defaultMoods: ['jazz', 'upbeat']
	},
	{
		category: 'blues',
		query:
			'collection:georgeblood AND year:[1919 TO 1927] AND mediatype:audio AND (subject:"Blues" OR subject:"Classic Blues")',
		targetCount: 12,
		rows: 45,
		defaultMoods: ['jazz', 'solemn']
	},
	{
		category: 'ballroom',
		query:
			'collection:georgeblood AND year:[1919 TO 1927] AND mediatype:audio AND (subject:"Dance" OR subject:"Waltz" OR subject:"Foxtrot" OR subject:"Popular Music" OR subject:"Vocal")',
		targetCount: 14,
		rows: 50,
		defaultMoods: ['fireside', 'upbeat']
	},
	{
		category: 'classical',
		query:
			'collection:georgeblood AND year:[1919 TO 1927] AND mediatype:audio AND (subject:"Classical" OR subject:"Orchestral" OR subject:"Violin" OR subject:"Piano" OR subject:"March" OR subject:"Opera")',
		targetCount: 12,
		rows: 45,
		defaultMoods: ['fireside', 'solemn']
	},
	{
		category: 'comedy',
		query:
			'collection:georgeblood AND year:[1919 TO 1927] AND mediatype:audio AND (subject:"Comedy" OR subject:"Humor" OR subject:"Humorous" OR subject:"Monologue" OR subject:"Spoken" OR subject:"Vaudeville")',
		targetCount: 10,
		rows: 45,
		defaultMoods: ['upbeat', 'fireside']
	}
];

function parseDurationSec(lengthRaw: string | number | undefined): number {
	if (typeof lengthRaw === 'number' && Number.isFinite(lengthRaw)) {
		return Math.round(lengthRaw);
	}
	if (typeof lengthRaw !== 'string') return 180;
	const trimmed = lengthRaw.trim();
	if (/^\d+(\.\d+)?$/.test(trimmed)) {
		return Math.round(Number(trimmed));
	}
	const parts = trimmed.split(':').map(Number);
	if (parts.length === 2 && parts.every(Number.isFinite)) {
		return Math.round(parts[0] * 60 + parts[1]);
	}
	if (parts.length === 3 && parts.every(Number.isFinite)) {
		return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
	}
	return 180;
}

function normalizeTitle(raw: string | string[] | undefined): string {
	const t = Array.isArray(raw) ? raw[0] : raw;
	return (t ?? 'Untitled 78rpm Recording').replace(/\s+/g, ' ').trim();
}

function normalizeCreator(raw: string | string[] | undefined): string {
	const c = Array.isArray(raw) ? raw[0] : raw;
	return (c ?? 'Unknown Orchestra').replace(/\s+/g, ' ').trim();
}

function inferMoods(doc: IaDoc, category: TrackCategory, fallback: MoodTag[]): MoodTag[] {
	const text = `${normalizeTitle(doc.title)} ${Array.isArray(doc.subject) ? doc.subject.join(' ') : doc.subject ?? ''}`.toLowerCase();
	const moods = new Set<MoodTag>();
	if (/blues|lament|moon|sleepy|night|waltz|serenade|nocturne|sonata|adagio/.test(text)) {
		moods.add('solemn');
		moods.add('fireside');
	}
	if (/stomp|hot|rag|charleston|tiger|black bottom|jazz/.test(text)) {
		moods.add('jazz');
		moods.add('upbeat');
	}
	if (/march|express|fast|galop|urgent/.test(text)) {
		moods.add('urgent');
	}
	if (category === 'comedy') {
		moods.add('upbeat');
		moods.add('fireside');
	}
	if (moods.size === 0) {
		for (const m of fallback) moods.add(m);
	}
	return Array.from(moods).slice(0, 3);
}

function selectBestMp3(files: IaMetaFile[]): IaMetaFile | null {
	const mp3s = files.filter((f) => f.name && f.name.toLowerCase().endsWith('.mp3'));
	if (mp3s.length === 0) return null;
	// Prefer standard non-_64kb VBR MP3 derivative
	const primary =
		mp3s.find((f) => f.format === 'VBR MP3' && !f.name!.endsWith('_64kb.mp3')) ??
		mp3s.find((f) => !f.name!.endsWith('_64kb.mp3')) ??
		mp3s[0];
	return primary;
}

async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T | null> {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'CenturyRadio/1.0 (https://century-radio.vercel.app)', Accept: 'application/json' },
			signal: AbortSignal.timeout(timeoutMs)
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 6): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let cursor = 0;
	const worker = async () => {
		while (cursor < items.length) {
			const idx = cursor++;
			results[idx] = await fn(items[idx]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
	return results;
}

async function verifyTrack(doc: IaDoc, bucket: BucketConfig): Promise<ArchiveTrack | null> {
	const title = normalizeTitle(doc.title);
	if (!doc.identifier || /none legible|illegible|test/i.test(title)) return null;

	const yearNum = Number(doc.year);
	if (!Number.isFinite(yearNum) || yearNum < 1919 || yearNum > 1927) return null;

	const meta = await fetchJson<{ files?: IaMetaFile[] }>(
		`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`,
		8000
	);
	if (!meta?.files?.length) return null;

	const mp3 = selectBestMp3(meta.files);
	if (!mp3?.name) return null;

	const durationSec = parseDurationSec(mp3.length);
	if (durationSec < 60 || durationSec > 360) return null;

	return {
		identifier: doc.identifier,
		mp3File: mp3.name,
		title,
		creator: normalizeCreator(doc.creator),
		year: Math.round(yearNum),
		durationSec,
		moodTags: inferMoods(doc, bucket.category, bucket.defaultMoods),
		category: bucket.category
	};
}

async function main() {
	const seenIdentifiers = new Set<string>();
	const seenTitles = new Set<string>();
	const catalog: ArchiveTrack[] = [];

	for (const bucket of BUCKETS) {
		const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
			bucket.query
		)}&fl[]=identifier,title,creator,year,subject&sort[]=downloads+desc&rows=${bucket.rows}&output=json`;

		const search = await fetchJson<{ response?: { docs?: IaDoc[] } }>(url, 15000);
		const docs = search?.response?.docs ?? [];
		console.log(`[${bucket.category}] search candidates: ${docs.length}`);

		const verified = await pMap(docs, (doc) => verifyTrack(doc, bucket), 6);
		let added = 0;

		for (const track of verified) {
			if (!track) continue;
			const titleKey = track.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
			if (seenIdentifiers.has(track.identifier) || seenTitles.has(titleKey)) continue;
			seenIdentifiers.add(track.identifier);
			seenTitles.add(titleKey);
			catalog.push(track);
			added++;
			if (added >= bucket.targetCount) break;
		}
		console.log(`[${bucket.category}] verified & added: ${added}`);
	}

	const outPath = resolve('src/lib/data/music-catalog.json');
	await writeFile(outPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');
	console.log(`Total indexed verified tracks: ${catalog.length} -> ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
