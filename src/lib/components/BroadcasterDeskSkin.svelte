<script lang="ts">
	import { formatCenturyDateLong } from '$lib/data/sampleBroadcast';
	import { AM_MAX_KHZ, AM_MIN_KHZ } from '$lib/physics/dialPhysics';
	import { radio } from '$lib/state/radioStore.svelte';
	import { formatClockSec, LANDMARK_DATES } from '$lib/utils/formatters';
	import LiveConsolePanel from './LiveConsolePanel.svelte';
	import PhosphorOscilloscope from './PhosphorOscilloscope.svelte';

	type DeskTab = 'clippings' | 'schedule';
	let activeTab = $state<DeskTab>('clippings');
	let tabRefs: Record<DeskTab, HTMLButtonElement | null> = {
		clippings: null,
		schedule: null
	};

	const stationMode = $derived(radio.signalLock.nearestStation?.programMode ?? null);

	function selectTab(tab: DeskTab, moveFocus = false) {
		activeTab = tab;
		if (moveFocus) {
			tabRefs[tab]?.focus();
		}
	}

	function onTabKeydown(e: KeyboardEvent) {
		const order: DeskTab[] = ['clippings', 'schedule'];
		const idx = order.indexOf(activeTab);
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			selectTab(order[(idx + 1) % order.length], true);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			selectTab(order[(idx - 1 + order.length) % order.length], true);
		} else if (e.key === 'Home') {
			e.preventDefault();
			selectTab(order[0], true);
		} else if (e.key === 'End') {
			e.preventDefault();
			selectTab(order[order.length - 1], true);
		}
	}
</script>

<section
	aria-label="Broadcaster's Desk Receiver and Wire Console"
	class="mx-auto max-w-6xl space-y-5"
>
	<!-- Compact Tactile Receiver Strip -->
	<div class="rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-chassis)] p-4 text-[var(--cr-text)] shadow-xl sm:p-5">
		<div class="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
			<!-- Left: Station Identity + Date Selector -->
			<div class="space-y-2 lg:col-span-5">
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="inline-block h-2.5 w-2.5 rounded-full"
						style="background-color: {radio.power === 'OFF'
							? '#78716c'
							: radio.power === 'WARMING_UP'
								? '#f59e0b'
								: '#ea580c'}; box-shadow: {radio.power !== 'OFF'
							? '0 0 8px rgba(234,88,12,0.75)'
							: 'none'};"
					></span>
					<span class="font-mono text-xs font-bold tracking-wider uppercase">
						{radio.signalLock.nearestStation?.callsign ?? 'INTER-CARRIER'}
					</span>
					<span class="font-mono text-xs text-[var(--cr-muted)]">
						• {Math.round(radio.frequencyKHz)} kHz • {radio.broadcastDay.stationLocation}
					</span>
				</div>

				<div class="text-lg font-semibold leading-tight">
					{formatCenturyDateLong(radio.broadcastDay.id)}
				</div>

				<div class="flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						onclick={() => radio.shiftDay(-1)}
						class="rounded-md border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2 py-1 font-mono text-[11px] font-semibold hover:border-[var(--cr-accent)]"
					>
						← Prev
					</button>
					<label for="desk-date-picker" class="visually-hidden">Broadcast Date</label>
					<input
						id="desk-date-picker"
						type="date"
						min="1926-01-01"
						max="1927-12-31"
						value={radio.broadcastDay.id}
						onchange={(e) => radio.setExactDate((e.currentTarget as HTMLInputElement).value)}
						class="rounded-md border border-[var(--cr-border)] bg-[var(--cr-dial-face)] px-2 py-0.5 font-mono text-[11px] font-bold"
					/>
					<button
						type="button"
						onclick={() => radio.shiftDay(1)}
						class="rounded-md border border-[var(--cr-border)] bg-[var(--cr-panel)] px-2 py-1 font-mono text-[11px] font-semibold hover:border-[var(--cr-accent)]"
					>
						Next →
					</button>

					{#each [100, 99] as offset}
						<button
							type="button"
							aria-pressed={radio.yearOffset === offset}
							onclick={() => radio.setYearOffset(offset)}
							class="rounded border px-2 py-1 font-mono text-[11px] {radio.yearOffset === offset
								? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
								: 'border-[var(--cr-border)] bg-[var(--cr-dial-face)]'}"
						>
							{new Date().getFullYear() - offset}
						</button>
					{/each}
				</div>
			</div>

			<!-- Center: Compact Amber CRT Scope + Tuning Dial -->
			<div class="space-y-2 lg:col-span-4">
				<PhosphorOscilloscope variant="amber" />
				<div class="flex items-center gap-3">
					<label for="desk-tuning-slider" class="font-mono text-[10px] text-[var(--cr-muted)] uppercase">
						Dial
					</label>
					<input
						id="desk-tuning-slider"
						type="range"
						min={AM_MIN_KHZ}
						max={AM_MAX_KHZ}
						step="1"
						value={Math.round(radio.frequencyKHz)}
						class="century-slider"
						style="--attr-min: {AM_MIN_KHZ}; --attr-max: {AM_MAX_KHZ}; --control-value: {radio.frequencyKHz};"
						oninput={(e) => radio.setFrequency(Number((e.currentTarget as HTMLInputElement).value), true)}
					/>
					<span class="shrink-0 font-mono text-xs font-bold">
						{Math.round(radio.frequencyKHz)}
					</span>
				</div>
			</div>

			<!-- Right: Power + Volume + Landmark Jump -->
			<div class="flex flex-col justify-between gap-2.5 lg:col-span-3">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-1" aria-hidden="true">
						{#each [0.25, 0.55, 0.85] as threshold}
							<span
								class="h-5 w-2.5 rounded-t-full border border-[var(--cr-border)] bg-stone-900"
								style="box-shadow: inset 0 0 6px rgba(255,120,28,{radio.power === 'OFF'
									? 0
									: Math.max(0.15, radio.warmupProgress - threshold * 0.2)});"
							></span>
						{/each}
					</div>
					<label class="flex cursor-pointer items-center gap-2 font-mono text-xs font-semibold uppercase">
						<span>{radio.power === 'OFF' ? 'Off' : radio.power === 'WARMING_UP' ? 'Warm' : 'On Air'}</span>
						<input
							type="checkbox"
							{...({ switch: '' } as Record<string, string>)}
							class="century-switch"
							checked={radio.power !== 'OFF'}
							onchange={() => void radio.togglePower()}
						/>
					</label>
				</div>

				<div class="flex items-center gap-2">
					<label for="desk-volume-slider" class="font-mono text-[10px] text-[var(--cr-muted)] uppercase">
						Vol
					</label>
					<input
						id="desk-volume-slider"
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={radio.volume}
						class="century-slider"
						style="--attr-min: 0; --attr-max: 1; --control-value: {radio.volume};"
						oninput={(e) => radio.setVolume(Number((e.currentTarget as HTMLInputElement).value))}
					/>
					<span class="w-8 text-right font-mono text-[11px]">{Math.round(radio.volume * 100)}%</span>
				</div>

				<select
					aria-label="Jump to Landmark Historical Date"
					onchange={(e) => {
						const v = (e.currentTarget as HTMLSelectElement).value;
						if (v) radio.setExactDate(v);
					}}
					class="w-full rounded-lg border border-[var(--cr-border)] bg-[var(--cr-dial-face)] px-2 py-1 font-mono text-[11px]"
				>
					<option value="">Jump to Landmark Broadcast…</option>
					{#each LANDMARK_DATES as lm}
						<option value={lm.iso} selected={lm.iso === radio.broadcastDay.id}>{lm.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Station Preset Band Strip -->
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cr-border)] pt-3">
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="AM Station Presets">
				{#each radio.stations as station}
					{@const active = radio.signalLock.nearestStation?.id === station.id}
					<button
						type="button"
						onclick={() => radio.tuneToStation(station)}
						class="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition {active
							? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
							: 'border-[var(--cr-border)] bg-[var(--cr-panel)] hover:border-[var(--cr-accent)]'}"
					>
						{station.frequencyKHz} kHz • {station.callsign}
					</button>
				{/each}
			</div>

			<label class="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-[var(--cr-muted)]">
				<input
					type="checkbox"
					checked={radio.voiceNarration}
					onchange={() => radio.toggleVoiceNarration()}
					class="accent-[var(--cr-accent)]"
				/>
				<span>Speech Fallback</span>
			</label>
		</div>
	</div>

	<!-- Two-Column Broadcaster's Desk: Live Console + Editorial Tabs -->
	<div class="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
		<div class="lg:col-span-7">
			<LiveConsolePanel variant="desk" />
		</div>

		<aside
			aria-label="Archival Clippings and Program Guide"
			class="rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-chassis)] shadow-lg lg:col-span-5"
		>
			<div class="century-tablist px-3 pt-1 font-mono uppercase" role="tablist" aria-label="Editorial Desk Views">
				<button
					bind:this={tabRefs.clippings}
					type="button"
					role="tab"
					id="desk-tab-clippings"
					aria-selected={activeTab === 'clippings'}
					tabindex={activeTab === 'clippings' ? 0 : -1}
					onclick={() => selectTab('clippings')}
					onkeydown={onTabKeydown}
				>
					Press Clippings ({radio.broadcastDay.clippings.length})
				</button>
				<button
					bind:this={tabRefs.schedule}
					type="button"
					role="tab"
					id="desk-tab-schedule"
					aria-selected={activeTab === 'schedule'}
					tabindex={activeTab === 'schedule' ? 0 : -1}
					onclick={() => selectTab('schedule')}
					onkeydown={onTabKeydown}
				>
					Program Guide ({stationMode === 'music_78' ? radio.kfoxPlaylist.length : radio.broadcastDay.segments.length})
				</button>
			</div>

			<!-- Tab Panel 1: Press Clippings (no padding/border/bg on role=tabpanel itself per modern-web-guidance) -->
			<div
				role="tabpanel"
				aria-labelledby="desk-tab-clippings"
				hidden={activeTab !== 'clippings' ? 'until-found' : undefined}
				onbeforematch={() => selectTab('clippings')}
			>
				<div class="century-scroll max-h-[620px] space-y-2.5 overflow-y-auto p-4">
					{#if radio.broadcastDay.clippings.length === 0}
						<p class="font-mono text-xs text-[var(--cr-muted)]">
							No archival clippings indexed for this date yet.
						</p>
					{:else}
						{#each radio.broadcastDay.clippings as clip, idx}
							<details
								class="century-accordion-item rounded-xl border border-[var(--cr-border)] bg-[var(--cr-newsprint)] px-3.5 py-2.5"
								open={idx < 2}
							>
								<summary class="text-xs font-semibold leading-snug text-[var(--cr-text)]">
									<span class="flex-1">
										<span class="block font-mono text-[10px] font-bold tracking-wider text-[var(--cr-accent)] uppercase">
											{clip.masthead} • {clip.date}
										</span>
										<span>{clip.headline}</span>
									</span>
								</summary>
								<div class="mt-2 border-t border-[var(--cr-border)] pt-2 text-xs leading-relaxed text-[var(--cr-muted)]">
									<p>{clip.summary}</p>
									{#if clip.url}
										<a
											href={clip.url}
											target="_blank"
											rel="noreferrer"
											class="mt-1.5 inline-block font-mono text-[11px] font-semibold text-[var(--cr-accent)] underline underline-offset-2"
										>
											Read Original Primary Source ↗
										</a>
									{/if}
								</div>
							</details>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Tab Panel 2: Program Guide -->
			<div
				role="tabpanel"
				aria-labelledby="desk-tab-schedule"
				hidden={activeTab !== 'schedule' ? 'until-found' : undefined}
				onbeforematch={() => selectTab('schedule')}
			>
				<div class="century-scroll max-h-[620px] space-y-2 overflow-y-auto p-4">
					{#if stationMode === 'music_78' && radio.kfoxPlaylist.length > 0}
						<div class="mb-2 font-mono text-[10px] font-bold tracking-wider text-[var(--cr-muted)] uppercase">
							KFOX-78 Verified 1920s Turntable Rotation
						</div>
						{#each radio.kfoxPlaylist as tr, idx}
							{@const isPlaying = idx === radio.kfoxIndex}
							<button
								type="button"
								onclick={() => radio.selectKfoxTrack(idx)}
								class="flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition {isPlaying
									? 'border-[var(--cr-accent)] bg-[var(--cr-accent)]/15'
									: 'border-[var(--cr-border)] bg-[var(--cr-newsprint)] hover:border-[var(--cr-accent)]'}"
							>
								<div class="min-w-0 flex-1">
									<div class="font-mono text-[10px] text-[var(--cr-muted)] uppercase">
										{tr.category} • {tr.year} {isPlaying ? '• SPINNING NOW' : ''}
									</div>
									<div class="truncate font-semibold">{tr.title}</div>
									<div class="truncate text-[11px] text-[var(--cr-muted)]">{tr.creator}</div>
								</div>
								<span class="shrink-0 font-mono text-[11px] text-[var(--cr-muted)]">
									{formatClockSec(tr.durationSec)}
								</span>
							</button>
						{/each}
					{:else}
						<div class="mb-2 flex items-center justify-between font-mono text-[10px] font-bold tracking-wider text-[var(--cr-muted)] uppercase">
							<span>{radio.broadcastDay.stationCallsign} Daily Continuity</span>
							<span>Total {formatClockSec(radio.broadcastDay.totalDurationSec)}</span>
						</div>
						{#each radio.broadcastDay.segments as seg, idx}
							{@const isCurrent = idx === radio.currentSegmentIndex}
							<button
								type="button"
								onclick={() => radio.selectSegment(idx)}
								class="flex w-full items-start justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition {isCurrent
									? 'border-[var(--cr-accent)] bg-[var(--cr-accent)]/15'
									: 'border-[var(--cr-border)] bg-[var(--cr-newsprint)] hover:border-[var(--cr-accent)]'}"
							>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
										<span class="font-bold {isCurrent ? 'text-[var(--cr-accent)]' : 'text-[var(--cr-muted)]'}">
											{String(seg.order).padStart(2, '0')} · +{formatClockSec(seg.scheduledOffsetSec)}
										</span>
										<span class="text-[var(--cr-muted)]">• {seg.type.replace(/_/g, ' ')}</span>
										{#if isCurrent}
											<span class="rounded bg-[var(--cr-accent)] px-1 py-0.2 text-[9px] font-bold text-white uppercase">
												On Air
											</span>
										{/if}
									</div>
									<div class="mt-0.5 font-semibold leading-snug">{seg.title}</div>
									{#if seg.speakerRole}
										<div class="mt-0.5 font-mono text-[10px] text-[var(--cr-muted)]">
											{seg.speakerRole}
										</div>
									{/if}
								</div>
								<span class="shrink-0 font-mono text-[11px] text-[var(--cr-muted)]">
									{formatClockSec(seg.durationSec)}
								</span>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</aside>
	</div>
</section>
