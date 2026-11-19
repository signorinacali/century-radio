<script lang="ts">
	import { onMount } from 'svelte';
	import { radio } from '$lib/state/radioStore.svelte';

	let needleAngle = $state(-42); // -42 deg (quiet) to +38 deg (peak)

	onMount(() => {
		let rafId = 0;
		let smoothed = 0;

		const tick = () => {
			const rms = radio.power !== 'OFF' ? radio.audio.getRmsLevel() : 0;
			// Asymmetric VU ballistics: fast attack, slower decay
			const coeff = rms > smoothed ? 0.35 : 0.08;
			smoothed += (rms - smoothed) * coeff;
			needleAngle = -42 + Math.min(1, smoothed) * 80;
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});
</script>

<div
	class="relative flex h-24 w-full items-end justify-center overflow-hidden rounded-lg border border-stone-400/50 shadow-inner"
	style="background: radial-gradient(circle at 50% 95%, rgba(255, 214, 140, {0.15 +
		radio.warmupProgress * 0.55}), #e8dfc8 72%);"
>
	<svg viewBox="0 0 180 96" class="h-full w-full" aria-hidden="true">
		<!-- VU Scale Arc -->
		<path
			d="M 24 78 A 72 72 0 0 1 156 78"
			fill="none"
			stroke="#3a332a"
			stroke-width="1.5"
		/>
		<path
			d="M 124 38 A 72 72 0 0 1 156 78"
			fill="none"
			stroke="#b91c1c"
			stroke-width="2.5"
		/>
		<!-- Ticks -->
		{#each [-36, -22, -8, 6, 20, 34] as deg}
			<line
				x1="90"
				y1="14"
				x2="90"
				y2="21"
				stroke={deg > 15 ? '#b91c1c' : '#3a332a'}
				stroke-width="1.5"
				transform="rotate({deg} 90 88)"
			/>
		{/each}
		<text x="90" y="54" text-anchor="middle" font-size="10" font-weight="700" fill="#3a332a">
			VU
		</text>
		<!-- Ballistic Needle -->
		<line
			x1="90"
			y1="88"
			x2="90"
			y2="16"
			stroke="#1f1d1a"
			stroke-width="2"
			stroke-linecap="round"
			transform="rotate({needleAngle} 90 88)"
		/>
		<circle cx="90" cy="88" r="6" fill="#292524" />
	</svg>
</div>
