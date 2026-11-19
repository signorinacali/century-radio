export type SegmentType =
	| 'STATION_ID'
	| 'NEWS_BULLETIN'
	| 'FEATURE_STORY'
	| 'MUSIC_INTERLUDE'
	| 'MARKET_REPORT'
	| 'SCIENCE_AND_AVIATION'
	| 'SPORTS_ROUNDUP'
	| 'VINTAGE_AD'
	| 'WEATHER_REPORT'
	| 'FIRESIDE_EDITORIAL'
	| 'TIME_SIGNAL'
	| 'RADIO_DRAMA'
	| 'VARIETY_HOUR'
	| 'COMEDY_SKETCH'
	| 'CONCERT_HALL'
	| 'OBITUARY_WIRE';

export type StationId = 'wcrn' | 'wgn';

export type MoodTag = 'urgent' | 'solemn' | 'upbeat' | 'jazz' | 'fireside';
export type TopicTag = 'politics' | 'aviation' | 'sports' | 'culture' | 'weather' | 'commerce';

export type TrackCategory = 'jazz' | 'ballroom' | 'blues' | 'classical' | 'vocal' | 'comedy';

export interface ArchiveTrack {
	identifier: string;
	mp3File: string;
	title: string;
	creator: string;
	year: number;
	durationSec: number;
	moodTags: MoodTag[];
	category: TrackCategory;
}

export interface HistoricalSource {
	provider: 'wikipedia' | 'chronicling_america' | 'curated_archive' | 'historical_press' | 'internet_archive';
	title: string;
	url?: string;
	originalDate: string;
	newspaper?: string;
	excerpt?: string;
}

export interface NewspaperClipping {
	id: string;
	masthead: string;
	headline: string;
	date: string;
	summary: string;
	category: string;
	url?: string;
	provider: HistoricalSource['provider'];
}

export interface AudioAsset {
	sourceType: 'tts_blob' | 'internet_archive' | 'synthesized';
	url: string;
	format: 'audio/wav' | 'audio/mpeg' | 'audio/ogg' | 'audio/webaudio';
	durationSec: number;
	voiceModel?: string;
	archiveId?: string;
}

export interface BroadcastSegment {
	id: string;
	order: number;
	type: SegmentType;
	title: string;
	scheduledOffsetSec: number;
	durationSec: number;
	moodTags: MoodTag[];
	topicTags: TopicTag[];
	scriptText: string;
	introText?: string;
	introAudioUrl?: string;
	showName?: string;
	speakerRole?: string;
	isMultiVoice?: boolean;
	audio: AudioAsset;
	sources: HistoricalSource[];
}

export interface BroadcastDay {
	schemaVersion: 3;
	id: string;
	stationId: StationId;
	stationCallsign: string;
	stationLocation: string;
	targetFrequencyKHz: number;
	wavelengthMeters: number;
	totalDurationSec: number;
	morseDispatch: string;
	clippings: NewspaperClipping[];
	segments: BroadcastSegment[];
	generatedBy?: string;
	generatedAt: string;
}

export interface StationPreset {
	id: string;
	callsign: string;
	label: string;
	frequencyKHz: number;
	programMode: 'broadcast' | 'time_signal' | 'music_78' | 'morse_code';
}
