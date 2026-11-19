<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import BraunLabSkin from '$lib/components/BraunLabSkin.svelte';
	import BroadcasterDeskSkin from '$lib/components/BroadcasterDeskSkin.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { radio } from '$lib/state/radioStore.svelte';

	type ViewSkin = 'lab' | 'desk';
	const VIEW_STORAGE_KEY = 'century-radio-view';

	let activeSkin = $state<ViewSkin>('desk');

	onMount(() => {
		try {
			const saved = localStorage.getItem(VIEW_STORAGE_KEY);
			if (saved === 'lab' || saved === 'desk') {
				activeSkin = saved;
			}
		} catch {}
	});

	function switchView(next: ViewSkin) {
		activeSkin = next;
		try {
			localStorage.setItem(VIEW_STORAGE_KEY, next);
		} catch {}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
			return;
		}
		if (e.key === 'p' || e.key === 'P') {
			void radio.togglePower();
		} else if (e.key === 'v' || e.key === 'V') {
			switchView(activeSkin === 'lab' ? 'desk' : 'lab');
		} else {
			const digit = parseInt(e.key, 10);
			if (!Number.isNaN(digit) && digit >= 1 && digit <= radio.stations.length) {
				const st = radio.stations[digit - 1];
				if (st) radio.tuneToStation(st);
			}
		}
	}

	onDestroy(() => {
		radio.destroy();
	});
</script>

<svelte:window
	onkeydown={handleGlobalKeydown}
	onpointerdown={() => void radio.audio.ensureUnlocked()}
/>

<div class="min-h-screen bg-[var(--cr-page-bg)] text-[var(--cr-text)]">
	<a
		href="#main-content"
		class="visually-hidden fixed left-3 top-3 z-50 rounded-lg bg-[var(--cr-text)] px-3 py-2 font-mono text-xs text-[var(--cr-chassis)]"
	>
		Skip to radio receiver
	</a>

	<!-- Accessible Live Status Announcement -->
	<div class="visually-hidden" aria-live="polite" aria-atomic="true">
		{#if radio.power === 'ON'}
			{radio.signalLock.nearestStation
				? `Tuned to ${radio.signalLock.nearestStation.callsign} at ${Math.round(radio.frequencyKHz)} kilohertz, ${radio.broadcastDay.id}`
				: `Static at ${Math.round(radio.frequencyKHz)} kilohertz`}
		{/if}
	</div>

	<header class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6 pb-4">
		<div>
			<div class="flex items-center gap-2.5">
				<h1 class="font-mono text-lg font-bold tracking-tight uppercase">
					Century Radio <span class="text-[var(--cr-muted)]">/ {radio.broadcastDay.id.slice(0, 4)} AM</span>
				</h1>
				<span
					class="rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase {radio.power === 'ON'
						? 'border-[var(--cr-accent)] bg-[var(--cr-accent)]/15 text-[var(--cr-accent)]'
						: 'border-[var(--cr-border)] text-[var(--cr-muted)]'}"
				>
					{radio.power === 'ON' ? '● Live On Air' : 'Standby'}
				</span>
			</div>
			<p class="text-xs text-[var(--cr-muted)]">
				On this day 100 years ago • Continuous AM Broadcast, Drama, Comedy &amp; 78rpm Music
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<div
				class="inline-flex rounded-xl border border-[var(--cr-border)] bg-[var(--cr-chassis)] p-0.5 font-mono text-xs shadow-sm"
				role="group"
				aria-label="Receiver View Mode"
			>
				<button
					type="button"
					aria-pressed={activeSkin === 'desk'}
					onclick={() => switchView('desk')}
					class="rounded-lg px-2.5 py-1 font-semibold transition {activeSkin === 'desk'
						? 'bg-[var(--cr-accent)] text-white'
						: 'text-[var(--cr-muted)] hover:text-[var(--cr-text)]'}"
				>
					Broadcaster’s Desk
				</button>
				<button
					type="button"
					aria-pressed={activeSkin === 'lab'}
					onclick={() => switchView('lab')}
					class="rounded-lg px-2.5 py-1 font-semibold transition {activeSkin === 'lab'
						? 'bg-[var(--cr-accent)] text-white'
						: 'text-[var(--cr-muted)] hover:text-[var(--cr-text)]'}"
				>
					Lab Receiver
				</button>
			</div>

			<ThemeToggle />
		</div>
	</header>

	<main id="main-content" tabindex="-1" class="px-4 pb-6 pt-2">
		{#if activeSkin === 'desk'}
			<BroadcasterDeskSkin />
		{:else}
			<BraunLabSkin />
		{/if}
	</main>

	<footer class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-10 font-mono text-[11px] text-[var(--cr-muted)]">
		<span>Shortcuts: [P] Power • [1–5] Stations • [V] Switch View • Drag/Wheel Dial</span>
		<span>Sources: Wikipedia Daily Chronicles • Historical Press Citations • Internet Archive Great 78 Project</span>
	</footer>
</div>
