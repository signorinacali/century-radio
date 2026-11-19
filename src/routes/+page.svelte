<script lang="ts">
	import { onDestroy } from 'svelte';
	import BraunLabSkin from '$lib/components/BraunLabSkin.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { radio } from '$lib/state/radioStore.svelte';

	onDestroy(() => {
		radio.destroy();
	});
</script>

<div class="min-h-screen bg-[var(--cr-page-bg)] text-[var(--cr-text)]">
	<a
		href="#main-content"
		class="visually-hidden fixed left-3 top-3 z-50 rounded-lg bg-[var(--cr-text)] px-3 py-2 font-mono text-xs text-[var(--cr-chassis)]"
	>
		Skip to radio receiver
	</a>

	<header class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 pt-6 pb-4">
		<div>
			<h1 class="font-mono text-lg font-bold tracking-tight uppercase">
				Century Radio <span class="text-[var(--cr-muted)]">/ {radio.broadcastDay.id.slice(0, 4)} AM</span>
			</h1>
			<p class="text-xs text-[var(--cr-muted)]">
				On this day 100 years ago • Live Web Audio DSP &amp; Historical Wire Broadcast
			</p>
		</div>

		<ThemeToggle />
	</header>

	<main id="main-content" tabindex="-1" class="px-4 pb-6 pt-2">
		<BraunLabSkin />
	</main>

	<footer class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 pb-10 font-mono text-[11px] text-[var(--cr-muted)]">
		<span>Shortcuts: [P] Power • [1–5] Presets • Drag/Wheel Dial</span>
		<span>Sources: Wikimedia • Library of Congress • Internet Archive Great 78 Project</span>
	</footer>
</div>
