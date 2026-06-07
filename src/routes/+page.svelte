<script lang="ts">
	import {
		ArrowDownRight,
		ArrowUpRight,
		Bell,
		Bot,
		Braces,
		ChevronDown,
		ChevronRight,
		Code2,
		Command,
		FileJson,
		Plus,
		Search,
		SlidersHorizontal,
		Terminal,
		TrendingUp
	} from '@lucide/svelte';

	type Status = 'analyzed' | 'running' | 'queued' | 'failed';

	const sourceMeta = {
		claude: { label: 'Claude Code', icon: Terminal },
		cursor: { label: 'Cursor', icon: Code2 },
		codex: { label: 'Codex', icon: Bot },
		pi: { label: 'Pi', icon: Braces },
		other: { label: 'Manual', icon: FileJson }
	} as const;

	type SourceKey = keyof typeof sourceMeta;

	type Session = {
		id: string;
		title: string;
		goal: string;
		source: SourceKey;
		status: Status;
		score: number | null;
		turns: number;
		tools: number;
		errors: number;
		duration: string;
		updated: string;
	};

	const sessions: Session[] = [
		{ id: 'ses_9f3a1c', title: 'SvelteKit import wizard', goal: 'Build a guided trace-import flow with client-side redaction', source: 'claude', status: 'analyzed', score: 4.6, turns: 42, tools: 24, errors: 3, duration: '38m', updated: '4m ago' },
		{ id: 'ses_71be08', title: 'Stripe webhook retries', goal: 'Make checkout webhooks idempotent and backoff on 5xx', source: 'cursor', status: 'running', score: null, turns: 28, tools: 19, errors: 1, duration: '12m', updated: 'live' },
		{ id: 'ses_22dd4e', title: 'Postgres index migration', goal: 'Add composite indexes for the sessions query path', source: 'codex', status: 'analyzed', score: 3.4, turns: 19, tools: 11, errors: 0, duration: '9m', updated: '1h ago' },
		{ id: 'ses_04ac9b', title: 'Refactor auth middleware', goal: 'Split Clerk session handling out of the request hook', source: 'claude', status: 'failed', score: 2.1, turns: 55, tools: 33, errors: 9, duration: '1h 4m', updated: '2h ago' },
		{ id: 'ses_5c8f12', title: 'CLI argument parser', goal: 'Port the flag parser from commander to a typed schema', source: 'pi', status: 'analyzed', score: 4.9, turns: 16, tools: 7, errors: 0, duration: '6m', updated: '5h ago' },
		{ id: 'ses_aa1077', title: 'Flaky e2e test triage', goal: 'Find and stabilize the intermittent checkout spec', source: 'cursor', status: 'queued', score: null, turns: 31, tools: 22, errors: 4, duration: '—', updated: '6h ago' },
		{ id: 'ses_3e90fd', title: 'Redaction pass tuning', goal: 'Reduce false positives on absolute-path detection', source: 'other', status: 'analyzed', score: 3.9, turns: 23, tools: 14, errors: 2, duration: '17m', updated: 'yesterday' },
		{ id: 'ses_b6c401', title: 'Convex schema rollout', goal: 'Model analysis jobs, reports, and rubric scores', source: 'codex', status: 'analyzed', score: 4.2, turns: 37, tools: 21, errors: 1, duration: '44m', updated: 'yesterday' }
	];

	const statusMeta: Record<Status, { label: string; color: string; live?: boolean }> = {
		analyzed: { label: 'Ready', color: 'var(--signal-success)' },
		running: { label: 'Building', color: 'var(--signal-warning)', live: true },
		queued: { label: 'Queued', color: 'var(--signal-muted)' },
		failed: { label: 'Error', color: 'var(--signal-danger)' }
	};

	const tabs = [
		{ label: 'Overview', active: false },
		{ label: 'Sessions', active: true },
		{ label: 'Imports', active: false },
		{ label: 'Redaction', active: false },
		{ label: 'Settings', active: false }
	];

	const metrics = [
		{ label: 'Sessions', value: '128', delta: '+12', up: true, positive: true },
		{ label: 'Avg quality', value: '4.1', delta: '+0.3', up: true, positive: true },
		{ label: 'Open risks', value: '6', delta: '-2', up: false, positive: true },
		{ label: 'Tool calls · 7d', value: '2,318', delta: '+418', up: true, positive: true }
	];

	const filters: { key: Status | 'all'; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'analyzed', label: 'Ready' },
		{ key: 'running', label: 'Active' },
		{ key: 'failed', label: 'Errored' }
	];

	let activeFilter = $state<Status | 'all'>('all');
	let query = $state('');

	const visible = $derived(
		sessions.filter((s) => {
			const matchesFilter =
				activeFilter === 'all' ||
				(activeFilter === 'running' ? s.status === 'running' || s.status === 'queued' : s.status === activeFilter);
			const q = query.trim().toLowerCase();
			const matchesQuery =
				q === '' || s.title.toLowerCase().includes(q) || s.goal.toLowerCase().includes(q) || s.id.includes(q);
			return matchesFilter && matchesQuery;
		})
	);

	function grade(score: number | null) {
		if (score === null) return '—';
		if (score >= 4.5) return 'A';
		if (score >= 4) return 'A-';
		if (score >= 3.5) return 'B';
		if (score >= 3) return 'B-';
		if (score >= 2.5) return 'C';
		return 'D';
	}

	function band(score: number | null) {
		if (score === null) return 'var(--signal-muted)';
		if (score >= 4) return 'var(--signal-success)';
		if (score >= 3) return 'var(--signal-warning)';
		return 'var(--signal-danger)';
	}
</script>

<svelte:head>
	<title>Sessions · Peek</title>
</svelte:head>

<div
	class="dark min-h-screen font-sans text-foreground"
	style="background: radial-gradient(120% 55% at 50% -8%, color-mix(in oklch, var(--signal-accent) 8%, transparent), transparent 55%), var(--background);"
>
	<!-- ── Tier 1: identity bar ──────────────────────────────────── -->
	<header class="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
		<div class="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 lg:px-6">
			<!-- Peek aperture mark — a lens glancing sideways -->
			<a href="#peek" class="flex items-center gap-2" aria-label="Peek home">
				<span class="peek-lens flex size-7 items-center justify-center">
					<svg viewBox="0 0 28 28" class="size-7" fill="none" aria-hidden="true">
						<rect x="3" y="3" width="22" height="22" rx="7.5" stroke="var(--signal-accent)" stroke-width="2.25" />
						<circle cx="16" cy="14" r="4.6" fill="var(--signal-accent)" />
						<circle cx="17.8" cy="12.2" r="1.5" fill="var(--background)" />
					</svg>
				</span>
				<span class="text-[15px] font-semibold lowercase tracking-tight">peek</span>
			</a>

			<!-- slash + workspace -->
			<svg viewBox="0 0 24 24" class="size-6 text-border" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M16.88 3.55 7.12 20.45" stroke-linecap="round" /></svg>
			<button class="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent">
				<span class="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-signal-accent to-signal-success text-[9px] font-semibold text-background">DX</span>
				<span class="text-sm font-medium">Daniel Xu</span>
				<span class="rounded-full border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">Free</span>
				<ChevronDown class="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
			</button>

			<!-- slash + project -->
			<svg viewBox="0 0 24 24" class="hidden size-6 text-border sm:block" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M16.88 3.55 7.12 20.45" stroke-linecap="round" /></svg>
			<button class="group hidden items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent sm:flex">
				<span class="text-sm font-medium">peek</span>
				<ChevronDown class="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
			</button>

			<div class="ml-auto flex items-center gap-1.5">
				<button class="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground md:flex">
					<Search class="size-3.5" />
					<span>Find…</span>
					<kbd class="ml-3 flex items-center gap-0.5 rounded border border-border px-1 py-0.5 font-mono text-[10px]"><Command class="size-2.5" />K</kbd>
				</button>
				<button class="hidden rounded-md border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground sm:block">Feedback</button>
				<button class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Notifications">
					<Bell class="size-4" />
				</button>
				<button class="ml-0.5 size-8 rounded-full bg-gradient-to-br from-signal-warning via-signal-danger to-signal-accent ring-1 ring-inset ring-white/10" aria-label="Account"></button>
			</div>
		</div>

		<!-- ── Tier 2: underline tabs ──────────────────────────────── -->
		<nav class="mx-auto flex max-w-[1280px] items-center gap-0.5 overflow-x-auto px-3 lg:px-5">
			{#each tabs as tab}
				<a href="#{tab.label.toLowerCase()}" class="relative flex h-11 shrink-0 items-center px-1">
					<span
						class="rounded-md px-3 py-1.5 text-sm transition-colors {tab.active
							? 'font-medium text-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
					>
						{tab.label}
					</span>
					{#if tab.active}
						<span class="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-signal-accent shadow-[0_0_12px_var(--signal-accent)]"></span>
					{/if}
				</a>
			{/each}
		</nav>
	</header>

	<!-- ── Content ───────────────────────────────────────────────── -->
	<main class="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-6">
		<div class="space-y-7">
			<!-- Page heading -->
			<div class="peek-rise flex flex-wrap items-end justify-between gap-4" style="animation-delay: 0ms">
				<div>
					<h1 class="text-[28px] font-semibold tracking-[-0.02em]">Sessions</h1>
					<p class="mt-1 text-sm text-muted-foreground">Imported agent runs across every harness, scored and ready to inspect.</p>
				</div>
				<div class="flex items-center gap-2">
					<button class="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground sm:flex">
						<SlidersHorizontal class="size-3.5" />
						Customize
					</button>
					<button class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
						<Plus class="size-4" />
						Import Session
					</button>
				</div>
			</div>

			<!-- Status row -->
			<div class="peek-rise flex items-center gap-2 text-xs text-muted-foreground" style="animation-delay: 40ms">
				<span class="relative flex size-1.5">
					<span class="absolute inline-flex size-full animate-ping rounded-full bg-signal-success/70"></span>
					<span class="relative inline-flex size-1.5 rounded-full bg-signal-success"></span>
				</span>
				<span class="font-mono">Redaction engine online · last sync 4m ago</span>
			</div>

			<!-- Metrics strip -->
			<div class="peek-rise grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:grid-cols-4 md:divide-y-0" style="animation-delay: 80ms">
				{#each metrics as m}
					<div class="flex flex-col gap-2 px-5 py-4">
						<span class="text-[13px] text-muted-foreground">{m.label}</span>
						<div class="flex items-baseline gap-2">
							<span class="text-2xl font-semibold tabular-nums tracking-tight">{m.value}</span>
							<span
								class="flex items-center gap-0.5 font-mono text-[11px] tabular-nums"
								style="color: {m.positive ? 'var(--signal-success)' : 'var(--signal-danger)'}"
							>
								{#if m.up}<ArrowUpRight class="size-3" />{:else}<ArrowDownRight class="size-3" />{/if}
								{m.delta}
							</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- Filter row -->
			<div class="peek-rise flex flex-wrap items-center gap-3" style="animation-delay: 120ms">
				<div class="flex items-center rounded-md border border-border bg-card p-0.5">
					{#each filters as f}
						<button
							onclick={() => (activeFilter = f.key)}
							class="rounded-[5px] px-3 py-1 text-[13px] font-medium transition-colors {activeFilter === f.key
								? 'bg-accent text-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{f.label}
						</button>
					{/each}
				</div>

				<div class="relative ml-auto flex items-center">
					<Search class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
					<input
						bind:value={query}
						placeholder="Search sessions…"
						class="w-64 rounded-md border border-border bg-card py-2 pl-8 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-signal-accent/60 focus:ring-1 focus:ring-signal-accent/40"
					/>
				</div>
			</div>

			<!-- Sessions table — the hero object -->
			<div class="peek-rise overflow-hidden rounded-xl border border-border bg-card" style="animation-delay: 180ms">
				<!-- column header -->
				<div class="grid grid-cols-[minmax(0,1fr)_120px_148px_120px_140px_88px] items-center gap-4 border-b border-border px-5 py-2.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
					<span>Session</span>
					<span>Source</span>
					<span>Quality</span>
					<span>Status</span>
					<span class="text-right">Activity</span>
					<span class="text-right">Updated</span>
				</div>

				{#each visible as s (s.id)}
					{@const sm = sourceMeta[s.source]}
					{@const st = statusMeta[s.status]}
					<a
						href="#{s.id}"
						class="group grid grid-cols-[minmax(0,1fr)_120px_148px_120px_140px_88px] items-center gap-4 border-b border-border px-5 py-3.5 transition-colors last:border-b-0 hover:bg-accent/40"
					>
						<!-- Session -->
						<div class="flex min-w-0 items-center gap-3">
							<div class="flex min-w-0 flex-col">
								<div class="flex items-center gap-2">
									<span class="truncate text-sm font-medium">{s.title}</span>
									<span class="shrink-0 font-mono text-[10px] text-muted-foreground/70">{s.id}</span>
								</div>
								<span class="truncate text-xs text-muted-foreground">{s.goal}</span>
							</div>
						</div>

						<!-- Source -->
						<div class="flex items-center gap-2 text-muted-foreground">
							<sm.icon class="size-3.5" />
							<span class="truncate text-xs">{sm.label}</span>
						</div>

						<!-- Quality -->
						<div class="flex items-center gap-2.5">
							<div class="flex gap-0.5">
								{#each Array(5) as _, i}
									<span
										class="h-3.5 w-1 rounded-[1px]"
										style="background: {s.score !== null && i < Math.round(s.score) ? band(s.score) : 'var(--muted)'}"
									></span>
								{/each}
							</div>
							<div class="flex items-baseline gap-1 font-mono text-xs">
								{#if s.score !== null}
									<span class="tabular-nums" style="color: {band(s.score)}">{s.score.toFixed(1)}</span>
									<span class="text-muted-foreground/60">{grade(s.score)}</span>
								{:else}
									<span class="text-muted-foreground/50">pending</span>
								{/if}
							</div>
						</div>

						<!-- Status -->
						<div class="flex items-center gap-2">
							<span class="relative flex size-2">
								{#if st.live}
									<span class="absolute inline-flex size-full animate-ping rounded-full opacity-70" style="background: {st.color}"></span>
								{/if}
								<span class="relative inline-flex size-2 rounded-full" style="background: {st.color}"></span>
							</span>
							<span class="text-xs" style="color: {st.color}">{st.label}</span>
						</div>

						<!-- Activity -->
						<div class="flex items-center justify-end gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
							<span title="turns">{s.turns}t</span>
							<span class="text-muted-foreground/40">·</span>
							<span title="tool calls">{s.tools} tc</span>
							<span class="text-muted-foreground/40">·</span>
							<span title="errors" style={s.errors > 0 ? 'color: var(--signal-danger)' : ''}>{s.errors}e</span>
						</div>

						<!-- Updated -->
						<div class="flex items-center justify-end gap-1.5">
							<span class="font-mono text-[11px] text-muted-foreground {s.updated === 'live' ? 'text-signal-warning' : ''}">{s.updated}</span>
							<ChevronRight class="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
						</div>
					</a>
				{/each}

				{#if visible.length === 0}
					<div class="flex flex-col items-center gap-2 px-5 py-16 text-center">
						<Search class="size-5 text-muted-foreground/50" />
						<p class="text-sm text-muted-foreground">No sessions match the current filter.</p>
					</div>
				{/if}
			</div>

			<!-- Footer line -->
			<div class="peek-rise flex items-center justify-between text-xs text-muted-foreground" style="animation-delay: 240ms">
				<span class="font-mono">{visible.length} of {sessions.length} sessions</span>
				<span class="flex items-center gap-1.5">
					<TrendingUp class="size-3.5" />
					Quality trending up 7% this week
				</span>
			</div>
		</div>
	</main>
</div>
