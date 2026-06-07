<script lang="ts">
  import { ArrowUpRight, ChevronRight, Plus, TrendingUp } from "@lucide/svelte";
  import { useQuery } from "convex-svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { api } from "$convex/_generated/api";
  import { analysisState, formatConfidence, formatDate, formatScore, sessionGoal, sourceMix } from "$lib/sessions/view-model";

  const statsQuery = useQuery(api.analysis.getDashboardStats, () => ({}));
  const recentQuery = useQuery(api.sessions.listRecentSessions, () => ({ limit: 4 }));
  const statusColor = (status: string) => (status === "completed" ? "var(--signal-success)" : status === "failed" ? "var(--signal-danger)" : status === "active" ? "var(--signal-warning)" : "var(--signal-muted)");
  const mix = $derived(statsQuery.data ? sourceMix(statsQuery.data.sourceCounts) : []);
</script>

<svelte:head><title>Overview · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow eyebrow-accent mb-2">Workspace overview</p>
        <h1 class="text-[28px] font-semibold tracking-tight">Overview</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">Quality, sources, and risk across every imported run.</p>
      </div>
      <a href="/import" class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"><Plus class="size-4" />Import session</a>
    </div>

    <div class="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <span class="relative flex size-1.5"><span class="absolute size-full animate-ping rounded-full bg-signal-success/70"></span><span class="relative size-1.5 rounded-full bg-signal-success"></span></span>
      Redaction engine online · all systems nominal
    </div>

    {#if statsQuery.error}<div class="panel p-5 text-sm text-signal-danger">Failed to load overview: {statsQuery.error.toString()}</div>{/if}

    <div class="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden md:grid-cols-4 md:divide-y-0">
      {#each [
        ["Sessions", statsQuery.data?.totalSessions?.toString() ?? "—", ""],
        ["Analyzed", statsQuery.data?.analyzedSessions?.toString() ?? "—", ""],
        ["Avg quality", formatScore(statsQuery.data?.averageQualityScore), ""],
        ["Avg confidence", formatConfidence(statsQuery.data?.averageConfidence), ""],
      ] as metric}
        <div class="min-h-[92px] px-5 py-4">
          <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{metric[0]}</p>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="tnum text-2xl font-semibold {statsQuery.isLoading ? 'h-8 w-16 animate-pulse rounded bg-muted text-transparent' : ''}">{metric[1]}</span>
            {#if metric[2]}<span class="flex items-center font-mono text-[11px] text-signal-success"><ArrowUpRight class="size-3" />{metric[2]}</span>{/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="grid gap-x-10 gap-y-8 lg:grid-cols-[1fr_280px]">
      <section>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="eyebrow">Recent activity</h2>
          <a href="/sessions" class="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">VIEW ALL<ChevronRight class="size-3" /></a>
        </div>
        <ul class="min-h-[208px] divide-y divide-border">
          {#if recentQuery.isLoading}
            {#each Array(4) as _}<li class="h-[52px] animate-pulse py-3"><div class="h-4 w-2/3 rounded bg-muted"></div><div class="mt-2 h-3 w-1/2 rounded bg-muted"></div></li>{/each}
          {:else if recentQuery.data?.length}
            {#each recentQuery.data as session}
              {@const state = analysisState(session)}
              <li><a href="/sessions/{session.id}" class="group flex items-center gap-3 py-3 transition-colors hover:text-foreground">
                <span class="size-2 shrink-0 rounded-full" style="background:{statusColor(state)}"></span>
                <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{session.title}</p><p class="truncate text-xs text-muted-foreground">{sessionGoal(session)}</p></div>
                <span class="tnum shrink-0 font-mono text-xs" style="color:{statusColor(state)}">{formatScore(session.latestReport?.overallScore)}</span>
                <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{formatDate(session.updatedAt ?? session.importedAt)}</span>
                <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a></li>
            {/each}
          {:else}
            <li class="py-8 text-sm text-muted-foreground">No imports yet. Import a session to populate recent activity.</li>
          {/if}
        </ul>
      </section>

      <aside class="space-y-8">
        <section>
          <div class="mb-4 flex items-center justify-between"><h2 class="eyebrow">Source mix</h2><span class="font-mono text-[10px] text-muted-foreground">ALL</span></div>
          {#if mix.length}
            <div class="flex h-2 overflow-hidden rounded-full">{#each mix as item}<span class="bg-signal-accent" style="width:{item.percent}%"></span>{/each}</div>
            <ul class="mt-4 divide-y divide-border">{#each mix as item}<li class="flex justify-between py-2 text-xs text-muted-foreground"><span>{item.label}</span><span class="tnum font-mono">{item.percent}%</span></li>{/each}</ul>
          {:else}<p class="text-xs text-muted-foreground">No imports yet.</p>{/if}
        </section>

        <section>
          <h2 class="eyebrow mb-4">Data gaps</h2>
          <div class="space-y-3 min-h-[72px]">
            {#if statsQuery.data?.commonRisks?.length}
              {#each statsQuery.data.commonRisks as risk}
                <div class="flex items-center gap-2.5 text-xs"><span class="size-1.5 rounded-full bg-signal-warning"></span><span class="text-muted-foreground">{risk.title}</span><span class="tnum ml-auto font-mono">{risk.count}</span></div>
              {/each}
            {:else}<p class="text-xs text-muted-foreground">No recurring data gaps detected.</p>{/if}
          </div>
        </section>
      </aside>
    </div>

    <div class="flex justify-between border-t border-border pt-5 text-xs text-muted-foreground">
      <span class="font-mono">{statsQuery.data?.totalSessions ?? 0} sessions tracked</span>
      <span class="flex items-center gap-1.5"><TrendingUp class="size-3.5" />Quality trend available after more reports</span>
    </div>
  </div>
</Shell>
