<script lang="ts">
	import { formatCenturyDateLong } from '$lib/data/sampleBroadcast';
	import { AM_MAX_KHZ, AM_MIN_KHZ } from '$lib/physics/dialPhysics';
	import { radio } from '$lib/state/radioStore.svelte';
	import { formatClockSec, LANDMARK_DATES } from '$lib/utils/formatters';
	import AnalogVuMeter from './AnalogVuMeter.svelte';
	import LiveConsolePanel from './LiveConsolePanel.svelte';
	import PhosphorOscilloscope from './PhosphorOscilloscope.svelte';

	let lastPointerX = 0;
	let lastPointerTime = 0;
	let pointerVelocity = 0;

	const dialPercent = $derived(
		((radio.frequencyKHz - AM_MIN_KHZ) / (AM_MAX_KHZ - AM_MIN_KHZ)) * 100
	);

	function onVernierPointerDown(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		radio.setDragging(true);
		lastPointerX = e.clientX;
		lastPointerTime = performance.now();
		pointerVelocity = 0;
	}

	function onVernierPointerMove(e: PointerEvent) {
		if (!radio.dial.isDragging) return;
		const now = performance.now();
		const dx = e.clientX - lastPointerX;
		const dt = Math.max(0.004, (now - lastPointerTime) / 1000);
		const deltaKHz = dx * 1.4;
		radio.setFrequency(radio.frequencyKHz + deltaKHz, true);
		pointerVelocity = deltaKHz / dt;
		lastPointerX = e.clientX;
		lastPointerTime = now;
	}

	function onVernierPointerUp() {
		if (!radio.dial.isDragging) return;
		radio.setDragging(false);
		radio.applyDialImpulse(pointerVelocity * 0.55);
	}

	function onVernierWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
		radio.applyDialImpulse(delta * 0.65);
	}
</script>

<section
	aria-label="Braun Lab Instrument Receiver"
	class="relative mx-auto max-w-5xl rounded-3xl border border-[var(--cr-border)] bg-[var(--cr-chassis)] p-6 text-[var(--cr-text)] shadow-2xl sm:p-8"
>
	<!-- Decorative Hardware Corner Screws -->
	{#each ['left-3.5 top-3.5', 'right-3.5 top-3.5', 'left-3.5 bottom-3.5', 'right-3.5 bottom-3.5'] as pos}
		<span
			aria-hidden="true"
			class="pointer-events-none absolute {pos} flex h-2.5 w-2.5 items-center justify-center rounded-full border border-[var(--cr-border)] bg-[var(--cr-panel)] opacity-70"
		>
			<span class="h-[1px] w-1.5 rotate-45 bg-[var(--cr-muted)]"></span>
		</span>
	{/each}

	<!-- Top Instrument Header -->
	<div class="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--cr-border)] pb-5">
		<div>
			<div class="flex items-center gap-2.5">
				<span
					class="inline-block h-2.5 w-2.5 rounded-full transition-colors duration-300"
					style="background-color: {radio.power === 'OFF'
						? '#78716c'
						: radio.power === 'WARMING_UP'
							? '#f59e0b'
							: '#ea580c'}; box-shadow: {radio.power !== 'OFF'
						? '0 0 10px rgba(234,88,12,0.8)'
						: 'none'};"
				></span>
				<span class="font-mono text-xs tracking-[0.18em] text-[var(--cr-muted)] uppercase">
					Model CR-26 • {radio.signalLock.nearestStation?.callsign ?? radio.broadcastDay.stationCallsign} ({radio.broadcastDay.stationLocation})
				</span>
			</div>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">
				{formatCenturyDateLong(radio.broadcastDay.id)}
			</h2>
		</div>

		<!-- Filament Tubes + Power Switch -->
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-1.5" aria-hidden="true">
				{#each [0.25, 0.55, 0.85] as threshold}
					<div class="h-7 w-3.5 rounded-t-full border border-[var(--cr-border)] bg-stone-900 p-0.5">
						<div
							class="h-full w-full rounded-t-full transition-all duration-300"
							style="background: radial-gradient(circle, rgba(255,120,28,{radio.power ===
							'OFF'
								? 0
								: Math.max(0.15, radio.warmupProgress - threshold * 0.2)}), transparent);"
						></div>
					</div>
				{/each}
			</div>

			<label class="flex cursor-pointer items-center gap-2.5 text-xs font-semibold tracking-wider uppercase">
				<span>
					{radio.power === 'OFF'
						? 'Power Off'
						: radio.power === 'WARMING_UP'
							? 'Warming'
							: 'On Air'}
				</span>
				<input
					type="checkbox"
					{...({ switch: '' } as Record<string, string>)}
					class="century-switch"
					checked={radio.power !== 'OFF'}
					onchange={() => void radio.togglePower()}
				/>
			</label>
		</div>
	</div>

	<!-- Telemetry Row: Oscilloscope + VU Meter -->
	<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
		<div class="md:col-span-2">
			<div class="mb-1.5 flex items-center justify-between font-mono text-[11px] text-[var(--cr-muted)] uppercase">
				<span>CRT Phosphor Monitor</span>
				<span>
					{radio.signalLock.nearestStation
						? `LOCKED • ${radio.signalLock.nearestStation.callsign}`
						: 'INTER-CARRIER STATIC'}
				</span>
			</div>
			<PhosphorOscilloscope variant="phosphor" />
		</div>
		<div>
			<div class="mb-1.5 flex items-center justify-between font-mono text-[11px] text-[var(--cr-muted)] uppercase">
				<span>Modulation</span>
				<span>{Math.round(radio.signalLock.signalStrength * 100)}% SIG</span>
			</div>
			<AnalogVuMeter />
		</div>
	</div>

	<!-- Vernier Drag Surface + Hairline Frequency Scale -->
	<div class="mt-6 rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-well)] p-4 shadow-inner">
		<div class="mb-2 flex items-baseline justify-between">
			<div class="flex items-center gap-3">
				<span class="font-mono text-xs tracking-widest text-[var(--cr-muted)] uppercase">
					AM Broadcast Band
				</span>
				<div class="hidden items-center gap-1 sm:flex" title="Carrier signal lock" aria-hidden="true">
					{#each [0.2, 0.45, 0.7, 0.9] as thresh}
						<span
							class="h-1.5 w-3 rounded-full transition-colors duration-150"
							style="background-color: {radio.power !== 'OFF' &&
							radio.signalLock.signalStrength >= thresh
								? '#22c55e'
								: 'var(--cr-track)'};"
						></span>
					{/each}
				</div>
			</div>
			<span class="font-mono text-3xl font-bold tracking-tight">
				{Math.round(radio.frequencyKHz)}
				<span class="text-sm font-normal text-[var(--cr-muted)]">kHz</span>
			</span>
		</div>

		<div
			role="presentation"
			onpointerdown={onVernierPointerDown}
			onpointermove={onVernierPointerMove}
			onpointerup={onVernierPointerUp}
			onpointercancel={onVernierPointerUp}
			onwheel={onVernierWheel}
			class="relative mb-3 h-14 cursor-grab touch-pan-y select-none overflow-hidden rounded-xl border border-[var(--cr-border)] bg-[var(--cr-dial-face)] active:cursor-grabbing"
		>
			<div class="absolute inset-x-4 top-2 flex justify-between font-mono text-[10px] text-[var(--cr-muted)]">
				{#each [550, 700, 850, 1000, 1150, 1300, 1450, 1600] as tick}
					<span>{tick}</span>
				{/each}
			</div>

			{#each radio.stations as st}
				{@const pos = ((st.frequencyKHz - AM_MIN_KHZ) / (AM_MAX_KHZ - AM_MIN_KHZ)) * 100}
				<div
					class="absolute bottom-1.5 -translate-x-1/2 font-mono text-[9px] font-semibold text-[var(--cr-accent)]"
					style="left: {pos}%;"
				>
					▲ {st.frequencyKHz}
				</div>
			{/each}

			<div
				class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--cr-accent)] shadow-[0_0_8px_rgba(217,93,30,0.7)]"
				style="left: {dialPercent}%;"
			></div>
		</div>

		<div>
			<label for="braun-tuning-slider" class="visually-hidden">
				AM Tuning Frequency in Kilocycles
			</label>
			<input
				id="braun-tuning-slider"
				type="range"
				min={AM_MIN_KHZ}
				max={AM_MAX_KHZ}
				step="1"
				value={Math.round(radio.frequencyKHz)}
				aria-valuetext={`${Math.round(radio.frequencyKHz)} kilohertz`}
				class="century-slider"
				style="--attr-min: {AM_MIN_KHZ}; --attr-max: {AM_MAX_KHZ}; --control-value: {radio.frequencyKHz};"
				oninput={(e) => radio.setFrequency(Number((e.currentTarget as HTMLInputElement).value), true)}
			/>
		</div>
	</div>

	<!-- Controls Row -->
	<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] p-3.5">
			<div class="mb-2 font-mono text-[11px] font-semibold tracking-wider text-[var(--cr-muted)] uppercase">
				Carrier Presets (Keys 1–5)
			</div>
			<div class="flex flex-wrap gap-2">
				{#each radio.stations as station}
					{@const active = radio.signalLock.nearestStation?.id === station.id}
					<button
						type="button"
						onclick={() => radio.tuneToStation(station)}
						class="rounded-lg border px-2.5 py-1.5 font-mono text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cr-accent)] {active
							? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
							: 'border-[var(--cr-border)] bg-[var(--cr-dial-face)] text-[var(--cr-text)] hover:border-[var(--cr-accent)]'}"
					>
						{station.frequencyKHz} • {station.callsign}
					</button>
				{/each}
			</div>
		</div>

		<div class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] p-3.5">
			<div class="mb-1 flex items-center justify-between font-mono text-[11px] font-semibold tracking-wider text-[var(--cr-muted)] uppercase">
				<label for="braun-volume-slider">Master Gain</label>
				<span>{Math.round(radio.volume * 100)}%</span>
			</div>
			<input
				id="braun-volume-slider"
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={radio.volume}
				class="century-slider"
				style="--attr-min: 0; --attr-max: 1; --control-value: {radio.volume};"
				oninput={(e) => radio.setVolume(Number((e.currentTarget as HTMLInputElement).value))}
			/>
			<label class="mt-1 flex cursor-pointer items-center gap-2 font-mono text-xs text-[var(--cr-muted)]">
				<input
					type="checkbox"
					checked={radio.voiceNarration}
					onchange={() => radio.toggleVoiceNarration()}
					class="accent-[var(--cr-accent)]"
				/>
				<span>Browser Speech Fallback</span>
			</label>
		</div>

		<div class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-panel)] p-3.5">
			<div class="mb-2 flex items-center justify-between font-mono text-[11px] font-semibold tracking-wider text-[var(--cr-muted)] uppercase">
				<span>Century Calendar</span>
				{#if radio.isLoadingBroadcast}
					<span class="text-[var(--cr-accent)]">Tuning Wire…</span>
				{/if}
			</div>
			<div class="flex items-center justify-between gap-2">
				<button
					type="button"
					onclick={() => radio.shiftDay(-1)}
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-dial-face)] px-2.5 py-1.5 font-mono text-xs font-semibold hover:border-[var(--cr-accent)]"
				>
					← Prev
				</button>
				<label for="braun-date-picker" class="visually-hidden">Broadcast Date (1926–1927)</label>
				<input
					id="braun-date-picker"
					type="date"
					min="1926-01-01"
					max="1927-12-31"
					value={radio.broadcastDay.id}
					onchange={(e) => radio.setExactDate((e.currentTarget as HTMLInputElement).value)}
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-dial-face)] px-2 py-1 font-mono text-xs font-bold text-[var(--cr-text)]"
				/>
				<button
					type="button"
					onclick={() => radio.shiftDay(1)}
					class="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-dial-face)] px-2.5 py-1.5 font-mono text-xs font-semibold hover:border-[var(--cr-accent)]"
				>
					Next →
				</button>
			</div>
			<div class="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
				<div class="flex items-center gap-1.5">
					<span class="text-[var(--cr-muted)]">Era:</span>
					{#each [100, 99] as offset}
						<button
							type="button"
							aria-pressed={radio.yearOffset === offset}
							onclick={() => radio.setYearOffset(offset)}
							class="rounded border px-2 py-0.5 transition {radio.yearOffset === offset
								? 'border-[var(--cr-accent)] bg-[var(--cr-accent)] text-white'
								: 'border-[var(--cr-border)] bg-[var(--cr-dial-face)] text-[var(--cr-text)]'}"
						>
							{new Date().getFullYear() - offset}
						</button>
					{/each}
				</div>
				<select
					aria-label="Jump to Landmark 1926–1927 Date"
					onchange={(e) => {
						const v = (e.currentTarget as HTMLSelectElement).value;
						if (v) radio.setExactDate(v);
					}}
					class="max-w-36 rounded border border-[var(--cr-border)] bg-[var(--cr-dial-face)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--cr-text)]"
				>
					<option value="">Historic Dates…</option>
					{#each LANDMARK_DATES as lm}
						<option value={lm.iso} selected={lm.iso === radio.broadcastDay.id}>{lm.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Station-Aware Live Program Surface -->
	<div class="mt-5">
		<LiveConsolePanel variant="lab" />
	</div>

	<!-- Collapsible Archival Clippings & Full Schedule Drawer -->
	<div class="mt-4 space-y-2.5">
		<details class="century-accordion-item rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-panel)] px-4 py-3">
			<summary class="font-mono text-xs font-bold tracking-wider uppercase">
				<span>Archival Press Clippings &amp; Sources ({radio.broadcastDay.clippings.length})</span>
			</summary>
			<div class="century-scroll mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
				{#each radio.broadcastDay.clippings as clip}
					<article class="rounded-xl border border-[var(--cr-border)] bg-[var(--cr-dial-face)] p-3 text-xs">
						<div class="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--cr-muted)] uppercase">
							<span>{clip.masthead}</span>
							<span>{clip.date}</span>
						</div>
						<h4 class="mt-1 font-semibold text-[var(--cr-text)]">{clip.headline}</h4>
						<p class="mt-1 leading-relaxed text-[var(--cr-muted)]">{clip.summary}</p>
						{#if clip.url}
							<a
								href={clip.url}
								target="_blank"
								rel="noreferrer"
								class="mt-1.5 inline-block font-mono text-[11px] text-[var(--cr-accent)] underline underline-offset-2"
							>
								Inspect Original Dispatch ↗
							</a>
						{/if}
					</article>
				{/each}
			</div>
		</details>

		<details class="century-accordion-item rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-panel)] px-4 py-3">
			<summary class="font-mono text-xs font-bold tracking-wider uppercase">
				<span>Complete Broadcast Program Guide ({radio.broadcastDay.segments.length} Shows • {formatClockSec(radio.broadcastDay.totalDurationSec)})</span>
			</summary>
			<div class="century-scroll mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
				{#each radio.broadcastDay.segments as seg, idx}
					{@const active = idx === radio.currentSegmentIndex}
					<button
						type="button"
						onclick={() => radio.selectSegment(idx)}
						class="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs transition {active
							? 'border-[var(--cr-accent)] bg-[var(--cr-accent)]/15'
							: 'border-[var(--cr-border)] bg-[var(--cr-dial-face)] hover:border-[var(--cr-accent)]'}"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 font-mono text-[10px] text-[var(--cr-muted)]">
								<span>+{formatClockSec(seg.scheduledOffsetSec)}</span>
								<span>•</span>
								<span>{seg.type.replace(/_/g, ' ')}</span>
							</div>
							<div class="truncate font-semibold text-[var(--cr-text)]">{seg.title}</div>
						</div>
						<span class="shrink-0 font-mono text-[11px] text-[var(--cr-muted)]">
							{formatClockSec(seg.durationSec)}
						</span>
					</button>
				{/each}
			</div>
		</details>
	</div>
</section>
