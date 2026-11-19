<script lang="ts">
	import { onMount } from 'svelte';
	import { radio } from '$lib/state/radioStore.svelte';

	let { variant = 'phosphor' }: { variant?: 'phosphor' | 'amber' } = $props();
	let canvasEl: HTMLCanvasElement;

	onMount(() => {
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		let rafId = 0;

		const draw = () => {
			const width = canvasEl.width;
			const height = canvasEl.height;

			// CRT phosphor persistence trail
			ctx.fillStyle = variant === 'phosphor' ? 'rgba(9, 18, 13, 0.28)' : 'rgba(20, 14, 9, 0.28)';
			ctx.fillRect(0, 0, width, height);

			// Subtle graticule grid
			ctx.strokeStyle =
				variant === 'phosphor' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(245, 158, 11, 0.08)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, height / 2);
			ctx.lineTo(width, height / 2);
			ctx.moveTo(width / 2, 0);
			ctx.lineTo(width / 2, height);
			ctx.stroke();

			const isPowered = radio.power !== 'OFF';
			const samples = isPowered ? radio.audio.getTimeDomainData() : null;

			ctx.strokeStyle =
				variant === 'phosphor'
					? `rgba(74, 222, 128, ${0.35 + radio.warmupProgress * 0.65})`
					: `rgba(251, 191, 36, ${0.35 + radio.warmupProgress * 0.65})`;
			ctx.lineWidth = 1.8;
			ctx.beginPath();

			if (!samples || !isPowered) {
				ctx.moveTo(0, height / 2);
				ctx.lineTo(width, height / 2);
			} else {
				const step = Math.max(1, Math.floor(samples.length / width));
				for (let x = 0; x < width; x++) {
					const idx = Math.min(samples.length - 1, x * step);
					const y = height / 2 + samples[idx] * (height * 0.42);
					if (x === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
			}
			ctx.stroke();

			rafId = requestAnimationFrame(draw);
		};

		rafId = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(rafId);
	});
</script>

<div class="relative overflow-hidden rounded-lg border border-black/30 bg-[#09120d] shadow-inner">
	<canvas
		bind:this={canvasEl}
		width={420}
		height={110}
		aria-hidden="true"
		class="block h-24 w-full"
	></canvas>
	<div
		class="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/30"
	></div>
</div>
