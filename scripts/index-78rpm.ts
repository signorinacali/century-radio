/**
 * Maintenance script to refresh src/lib/data/music-catalog.json from
 * the Internet Archive Great 78 Project (collection:georgeblood).
 *
 * Run with Node 22+:
 *   node --experimental-strip-types scripts/index-78rpm.ts
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface IaDoc {
	identifier: string;
	title?: string;
	creator?: string;
	year?: string | number;
}

async function main() {
	const query = 'collection:georgeblood AND year:[1918 TO 1927] AND mediatype:audio';
	const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
		query
	)}&fl[]=identifier,title,creator,year&rows=40&output=json`;

	const res = await fetch(url, {
		headers: { 'User-Agent': 'CenturyRadio/1.0' }
	});
	if (!res.ok) {
		throw new Error(`Internet Archive search failed: ${res.status}`);
	}

	const data = (await res.json()) as { response?: { docs?: IaDoc[] } };
	const docs = data.response?.docs ?? [];
	const moodRotation: Array<Array<'jazz' | 'upbeat' | 'solemn' | 'fireside' | 'urgent'>> = [
		['jazz', 'upbeat'],
		['fireside', 'upbeat'],
		['jazz', 'solemn'],
		['jazz', 'urgent'],
		['fireside', 'solemn']
	];

	const catalog = docs
		.filter((d) => d.identifier && d.title)
		.slice(0, 30)
		.map((d, idx) => ({
			identifier: d.identifier,
			title: d.title ?? 'Untitled 78rpm Recording',
			creator: Array.isArray(d.creator) ? d.creator[0] : (d.creator ?? 'Unknown Orchestra'),
			year: Math.min(1927, Math.max(1918, Number(d.year) || 1926)),
			durationSec: 180,
			moodTags: moodRotation[idx % moodRotation.length]
		}));

	const outPath = resolve('src/lib/data/music-catalog.json');
	await writeFile(outPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');
	console.log(`Indexed ${catalog.length} Great 78 Project tracks into ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
