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
	| 'TIME_SIGNAL';

export type MoodTag = 'urgent' | 'solemn' | 'upbeat' | 'jazz' | 'fireside';
export type TopicTag = 'politics' | 'aviation' | 'sports' | 'culture' | 'weather' | 'commerce';

export interface HistoricalSource {
	provider: 'wikipedia' | 'chronicling_america' | 'curated_archive';
	title: string;
	url?: string;
	originalDate: string;
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
	audio: AudioAsset;
	sources: HistoricalSource[];
}

export interface BroadcastDay {
	schemaVersion: 2;
	id: string;
	stationCallsign: string;
	stationLocation: string;
	targetFrequencyKHz: number;
	totalDurationSec: number;
	segments: BroadcastSegment[];
	generatedAt: string;
}

export interface StationPreset {
	id: string;
	callsign: string;
	label: string;
	frequencyKHz: number;
	programMode: 'broadcast' | 'time_signal' | 'music_78' | 'morse_code';
}
