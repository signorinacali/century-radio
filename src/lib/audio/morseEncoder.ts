const MORSE_TABLE: Record<string, string> = {
	A: '.-',
	B: '-...',
	C: '-.-.',
	D: '-..',
	E: '.',
	F: '..-.',
	G: '--.',
	H: '....',
	I: '..',
	J: '.---',
	K: '-.-',
	L: '.-..',
	M: '--',
	N: '-.',
	O: '---',
	P: '.--.',
	Q: '--.-',
	R: '.-.',
	S: '...',
	T: '-',
	U: '..-',
	V: '...-',
	W: '.--',
	X: '-..-',
	Y: '-.--',
	Z: '--..',
	'0': '-----',
	'1': '.----',
	'2': '..---',
	'3': '...--',
	'4': '....-',
	'5': '.....',
	'6': '-....',
	'7': '--...',
	'8': '---..',
	'9': '----.',
	'.': '.-.-.-',
	',': '--..--',
	'?': '..--..',
	"'": '.----.',
	'/': '-..-.',
	'(': '-.--.',
	')': '-.--.-',
	'&': '.-...',
	':': '---...',
	';': '-.-.-.',
	'=': '-...-',
	'+': '.-.-.',
	'-': '-....-',
	'"': '.-..-.'
};

export interface MorseSymbolEvent {
	on: boolean;
	units: number;
	emitChar?: string;
}

export function getMorseCodeForChar(ch: string): string | undefined {
	return MORSE_TABLE[ch.toUpperCase()];
}

/**
 * Encodes plain text into ITU Morse timing events (~17 WPM at unitMs = 70ms).
 * Emits `emitChar` at the conclusion of each encoded character or word space.
 */
export function encodeMorseSymbols(text: string): MorseSymbolEvent[] {
	const clean = text.toUpperCase().replace(/\s+/g, ' ').trim();
	if (!clean) return [];

	const events: MorseSymbolEvent[] = [];

	for (let i = 0; i < clean.length; i++) {
		const ch = clean[i];
		if (ch === ' ') {
			// Previous character already had a 3-unit pause or start of string; add 4 units for total 7-unit word space
			events.push({ on: false, units: 4, emitChar: ' ' });
			continue;
		}

		const pattern = MORSE_TABLE[ch];
		if (!pattern) continue;

		for (let j = 0; j < pattern.length; j++) {
			const elem = pattern[j];
			events.push({ on: true, units: elem === '-' ? 3 : 1 });
			if (j < pattern.length - 1) {
				events.push({ on: false, units: 1 });
			}
		}

		events.push({ on: false, units: 3, emitChar: ch });
	}

	// Trailing pause before looping dispatch
	events.push({ on: false, units: 14, emitChar: '   ' });
	return events;
}
