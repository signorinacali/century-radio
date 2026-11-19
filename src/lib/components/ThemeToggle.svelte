<script lang="ts">
	import { onMount } from 'svelte';

	const STORAGE_KEY = 'color-scheme';

	function getMeta(): HTMLMetaElement | null {
		return document.querySelector('meta[name="color-scheme"]');
	}

	function getSystemScheme(): 'light' | 'dark' {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyMeta(value: 'light' | 'dark' | 'light dark') {
		const meta = getMeta();
		if (meta) meta.content = value;
	}

	function toggleTheme() {
		let stored: string | null = null;
		try {
			stored = localStorage.getItem(STORAGE_KEY);
		} catch {}

		const system = getSystemScheme();
		const rendered = stored === 'light' || stored === 'dark' ? stored : system;
		const target: 'light' | 'dark' = rendered === 'dark' ? 'light' : 'dark';

		if (target === system) {
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {}
			applyMeta('light dark');
		} else {
			try {
				localStorage.setItem(STORAGE_KEY, target);
			} catch {}
			applyMeta(target);
		}
	}

	onMount(() => {
		const onStorage = (e: StorageEvent) => {
			if (e.key !== STORAGE_KEY) return;
			const next = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : 'light dark';
			applyMeta(next);
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});
</script>

<button
	type="button"
	onclick={toggleTheme}
	class="theme-toggle inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-chassis)] px-3 py-1.5 font-mono text-xs font-semibold text-[var(--cr-text)] shadow-sm transition hover:border-[var(--cr-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cr-accent)]"
>
	<span class="icon-to-dark items-center gap-1.5">
		<svg aria-hidden="true" viewBox="0 0 20 20" class="h-3.5 w-3.5 fill-current">
			<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
		</svg>
		<span>Dark</span>
		<span class="visually-hidden">Switch to dark theme</span>
	</span>
	<span class="icon-to-light items-center gap-1.5">
		<svg aria-hidden="true" viewBox="0 0 20 20" class="h-3.5 w-3.5 fill-current">
			<path
				fill-rule="evenodd"
				d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
				clip-rule="evenodd"
			/>
		</svg>
		<span>Light</span>
		<span class="visually-hidden">Switch to light theme</span>
	</span>
</button>
