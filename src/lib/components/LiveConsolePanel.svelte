<script lang="ts">
	import { formatCenturyDateLong } from '$lib/data/sampleBroadcast';
	import { radio } from '$lib/state/radioStore.svelte';
	import { formatAudioStatusLabel, formatClockSec } from '$lib/utils/formatters';

	let { variant = 'lab' }: { variant?: 'lab' | 'desk' } = $props();

	const stationMode = $derived(radio.signalLock.nearestStation?.programMode ?? null);
	const isBroadcastLocked = $derived(
		stationMode === 'broadcast' && radio.signalLock.signalStrength >= 0.4
	);
	const isMusic78 = $derived(stationMode === 'music_78' && radio.signalLock.signalStrength >= 0.4);
	const isMorse = $derived(stationMode === 'morse_code' && radio.signalLock.signalStrength >= 0.4);
	const isTimeSignal = $derived(
		stationMode === 'time_signal' && radio.signalLock.signalStrength >= 0.4
	);

	const activeDuration = $derived(
		radio.activeTrackDurationSec > 0 ? radio.activeTrackDurationSec : radio.currentSegment.durationSec
	);

	const kfoxDuration = $derived(
		radio.activeTrackDurationSec > 0
			? radio.activeTrackDurationSec
			: (radio.currentKfoxTrack?.durationSec ?? 180)
	);
</script>

<div
	class="rounded-2xl border border-[var(--cr-border)] p-4 sm:p-5 {variant === 'desk'
		? 'bg-[var(--cr-newsprint)] shadow-sm'
		: 'bg-[var(--cr-card)]'}"
>
	{#if isMorse}
		<!-- WCC-MARCONI: Live Decoded CW Telegraph Console -->
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cr-border)] pb-3">
			<div>
				<span class="font-mono text-[11px] font-bold tracking-widest text-[var(--cr-accent)] uppercase">
					640 kHz • WCC-MARCONI • Chatham, Massachusetts
				</span>
				<h3 class="mt-0.5 text-base font-semibold">
					Transatlantic Marine &amp; Press Continuous-Wave Telegraphy
				</h3>
			</div>
			<span class="rounded-full border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
				{radio.power === 'ON' ? 'CW KEYING • 750 HZ' : 'RECEIVER STANDBY'}
			</span>
		</div>

		<div class="mt-3 rounded-xl border border-[var(--cr-border)] bg-[#101410] p-3.5 font-mono text-xs text-emerald-300 shadow-inner">
			<div class="mb-1.5 flex items-center justify-between text-[10px] tracking-wider text-emerald-400/75 uppercase">
				<span>Live Decoded Paper Tape</span>
				<span>~17 WPM ITU CW</span>
			</div>
			<p class="min-h-14 break-words leading-relaxed tracking-wider">
				{radio.power === 'ON'
					? radio.morseTape || 'LISTENING FOR CARRIER KEYING…'
					: 'FLIP POWER SWITCH TO COPY LIVE CHATHAM MARINE WIRE DISPATCHES.'}
			</p>
		</div>

		<details class="century-accordion-item mt-3 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] px-3 py-2 text-xs">
			<summary class="font-mono font-semibold text-[var(--cr-text)]">
				<span>Full Transmitted Wire Text ({radio.broadcastDay.id})</span>
			</summary>
			<p class="mt-2 break-words font-mono text-[11px] leading-relaxed text-[var(--cr-muted)]">
				{radio.broadcastDay.morseDispatch}
			</p>
		</details>

	{:else if isTimeSignal}
		<!-- NAA-TIME: U.S. Naval Observatory Chronometer -->
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cr-border)] pb-3">
			<div>
				<span class="font-mono text-[11px] font-bold tracking-widest text-[var(--cr-accent)] uppercase">
					980 kHz • NAA-TIME • Arlington, Virginia
				</span>
				<h3 class="mt-0.5 text-base font-semibold">
					United States Naval Observatory Standard Time Signal
				</h3>
			</div>
			<span class="inline-flex items-center gap-1.5 rounded-full border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
				<span
					class="inline-block h-2 w-2 rounded-full transition-opacity duration-75"
					style="background-color: {radio.power === 'ON' && radio.naaPulseActive
						? '#22c55e'
						: '#78716c'}; opacity: {radio.power === 'ON' && radio.naaPulseActive ? 1 : 0.45};"
				></span>
				{radio.power === 'ON' ? '1 HZ ARLINGTON SYNC' : 'STANDBY'}
			</span>
		</div>

		<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] p-3">
				<div class="font-mono text-[10px] tracking-wider text-[var(--cr-muted)] uppercase">Historical Date</div>
				<div class="mt-1 font-mono text-sm font-bold">{formatCenturyDateLong(radio.broadcastDay.id)}</div>
			</div>
			<div class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] p-3">
				<div class="font-mono text-[10px] tracking-wider text-[var(--cr-muted)] uppercase">75th Meridian (EST)</div>
				<div class="mt-1 font-mono text-2xl font-bold tracking-tight">{radio.chronometerEst || '--:--:--'}</div>
			</div>
			<div class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] p-3">
				<div class="font-mono text-[10px] tracking-wider text-[var(--cr-muted)] uppercase">Greenwich Mean (UTC)</div>
				<div class="mt-1 font-mono text-2xl font-bold tracking-tight">{radio.chronometerUtc || '--:--:--'}</div>
			</div>
		</div>

		<p class="mt-3 text-xs leading-relaxed text-[var(--cr-muted)]">
			Station NAA transmits standardized Naval Observatory pulses every second except the 29th and seconds 55–59, culminating in a long 1000 Hz tone on the exact minute mark (:00) used by mariners, telegraphers, and jewelers across North America.
		</p>

	{:else if isMusic78}
		<!-- KFOX-78: Non-Stop Great 78 Project Stream -->
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cr-border)] pb-3">
			<div>
				<span class="font-mono text-[11px] font-bold tracking-widest text-[var(--cr-accent)] uppercase">
					1240 kHz • KFOX-78 • Continuous Shellac Turntable
				</span>
				<h3 class="mt-0.5 text-lg font-semibold">
					{radio.currentKfoxTrack ? radio.currentKfoxTrack.title : 'Loading 1920s Great 78 Archive…'}
				</h3>
				{#if radio.currentKfoxTrack}
					<p class="font-mono text-xs text-[var(--cr-muted)]">
						{radio.currentKfoxTrack.creator} • Recorded {radio.currentKfoxTrack.year} • {radio.currentKfoxTrack.category.toUpperCase()}
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onclick={() => radio.prevKfoxTrack()}
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-[var(--cr-accent)]"
				>
					◀ Prev Disc
				</button>
				<button
					type="button"
					onclick={() => radio.nextKfoxTrack()}
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-[var(--cr-accent)]"
				>
					Next Disc ▶
				</button>
				<button
					type="button"
					onclick={() => radio.syncToLive()}
					aria-pressed={radio.liveMode}
					class="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition {radio.liveMode
						? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
						: 'border-[var(--cr-border)] bg-[var(--cr-panel)] text-[var(--cr-text)]'}"
				>
					● Live Sync
				</button>
			</div>
		</div>

		<div class="mt-3">
			<div class="mb-1 flex items-center justify-between font-mono text-[11px] text-[var(--cr-muted)]">
				<span>{formatAudioStatusLabel(radio.power, radio.audioState)}</span>
				<span>{formatClockSec(radio.kfoxElapsedSec)} / {formatClockSec(kfoxDuration)}</span>
			</div>
			<progress
				class="century-progress"
				aria-label="78rpm record playback progress"
				max={Math.max(1, kfoxDuration)}
				value={radio.audioState === 'buffering' ? undefined : Math.min(kfoxDuration, radio.kfoxElapsedSec)}
			></progress>
		</div>

		{#if radio.currentKfoxTrack}
			<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
				<div class="flex flex-wrap gap-1.5">
					{#each radio.currentKfoxTrack.moodTags as tag}
						<span class="rounded-full border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2 py-0.5 font-mono text-[10px] uppercase">
							{tag}
						</span>
					{/each}
				</div>
				<a
					href={radio.currentKfoxTrack.archiveUrl}
					target="_blank"
					rel="noreferrer"
					class="font-mono text-[11px] underline decoration-[var(--cr-border)] underline-offset-2 hover:text-[var(--cr-accent)]"
				>
					Inspect Great 78 Item ↗
				</a>
			</div>
		{/if}

		{#if radio.upcomingKfoxTracks.length > 0}
			<div class="mt-4 border-t border-[var(--cr-border)] pt-3">
				<div class="mb-1.5 font-mono text-[10px] font-bold tracking-wider text-[var(--cr-muted)] uppercase">
					Up Next on Turntable (Non-Stop Rotation)
				</div>
				<ul class="space-y-1 text-xs">
					{#each radio.upcomingKfoxTracks as up}
						<li class="flex items-center justify-between gap-2 font-mono text-[11px]">
							<span class="truncate">{up.title} — <span class="text-[var(--cr-muted)]">{up.creator}</span></span>
							<span class="shrink-0 text-[var(--cr-muted)]">{up.year}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

	{:else}
		<!-- WCRN-AM / WGN-MIDWEST Broadcast Console (or inter-carrier static notice) -->
		<div class="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--cr-border)] pb-3">
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2 font-mono text-[11px]">
					<span class="font-bold tracking-wider text-[var(--cr-accent)] uppercase">
						{radio.broadcastDay.stationCallsign} • {radio.broadcastDay.targetFrequencyKHz} kHz
					</span>
					<span class="text-[var(--cr-muted)]">•</span>
					<span class="rounded border border-[var(--cr-border)] bg-[var(--cr-panel)] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
						{radio.currentSegment.type.replace(/_/g, ' ')}
					</span>
					<span class="rounded border border-[var(--cr-border)] bg-[var(--cr-panel)] px-1.5 py-0.5 text-[10px] text-[var(--cr-muted)] uppercase">
						{formatAudioStatusLabel(radio.power, radio.audioState)}
					</span>
				</div>
				<h3 class="mt-1 text-lg font-semibold leading-snug">
					{radio.currentSegment.title}
				</h3>
				{#if radio.currentSegment.showName || radio.currentSegment.speakerRole}
					<p class="mt-0.5 font-mono text-[11px] text-[var(--cr-muted)]">
						{#if radio.currentSegment.showName}
							<span>{radio.currentSegment.showName}</span>
						{/if}
						{#if radio.currentSegment.showName && radio.currentSegment.speakerRole}
							<span> • </span>
						{/if}
						{#if radio.currentSegment.speakerRole}
							<span>{radio.currentSegment.speakerRole}</span>
						{/if}
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onclick={() => radio.prevSegment()}
					aria-label="Previous broadcast segment"
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-[var(--cr-accent)]"
				>
					◀ Prev
				</button>
				<button
					type="button"
					onclick={() => radio.nextSegment()}
					aria-label="Next broadcast segment"
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-[var(--cr-accent)]"
				>
					Next ▶
				</button>
				<button
					type="button"
					onclick={() => radio.syncToLive()}
					aria-pressed={radio.liveMode}
					class="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition {radio.liveMode
						? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
						: 'border-[var(--cr-border)] bg-[var(--cr-panel)] text-[var(--cr-text)]'}"
				>
					● Live Sync
				</button>
			</div>
		</div>

		{#if !isBroadcastLocked && radio.signalLock.signalStrength < 0.4}
			<div class="mt-3 rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-[var(--cr-muted)]">
				Inter-carrier static at {Math.round(radio.frequencyKHz)} kHz — tune to 710 kHz (WCRN-AM) or 870 kHz (WGN-MIDWEST) for clear broadcast reception.
			</div>
		{/if}

		{#if variant === 'lab'}
			<div class="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Broadcast Segments">
				{#each radio.broadcastDay.segments as seg, idx}
					{@const isCurrent = idx === radio.currentSegmentIndex}
					<button
						type="button"
						onclick={() => radio.selectSegment(idx)}
						class="rounded-md border px-2 py-1 font-mono text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cr-accent)] {isCurrent
							? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
							: 'border-[var(--cr-border)] bg-[var(--cr-panel)] text-[var(--cr-muted)] hover:text-[var(--cr-text)]'}"
					>
						{String(seg.order).padStart(2, '0')} · {seg.type.replace(/_/g, ' ')}
					</button>
				{/each}
			</div>
		{/if}

		<div class="mt-3">
			<div class="mb-1 flex items-center justify-between font-mono text-[11px] text-[var(--cr-muted)]">
				<span>
					Segment {String(radio.currentSegment.order).padStart(2, '0')} of {radio.broadcastDay.segments.length}
				</span>
				<span>{formatClockSec(radio.segmentElapsedSec)} / {formatClockSec(activeDuration)}</span>
			</div>
			<progress
				class="century-progress"
				aria-label="Broadcast segment playback progress"
				max={Math.max(1, activeDuration)}
				value={radio.audioState === 'buffering' ? undefined : Math.min(activeDuration, radio.segmentElapsedSec)}
			></progress>
		</div>

		<div class="mt-3.5 space-y-3 text-sm leading-relaxed">
			{#each radio.currentSegment.scriptText.split(/\n\s*\n/) as para}
				<p>{para}</p>
			{/each}
		</div>

		{#if radio.currentSegment.sources.length > 0}
			<ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--cr-border)] pt-2.5 font-mono text-[11px] text-[var(--cr-muted)]">
				{#each radio.currentSegment.sources as src}
					<li>
						{#if src.url}
							<a
								href={src.url}
								target="_blank"
								rel="noreferrer"
								class="underline decoration-[var(--cr-border)] underline-offset-2 hover:text-[var(--cr-accent)]"
							>
								Source: {src.title} ↗
							</a>
						{:else}
							<span>Source: {src.title}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
