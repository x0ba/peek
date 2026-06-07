<script lang="ts">
  import { Bot, Braces, ChevronRight, Code2, FileJson, Plus, Search, Terminal } from "@lucide/svelte";
  import { useQuery } from "convex-svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { api } from "$convex/_generated/api";
  import type { AgentSource } from "$lib/contracts/api";
  import { analysisState, formatDate, formatScore, sessionGoal, sourceLabels, statusLabel } from "$lib/sessions/view-model";

  const icons: Record<AgentSource, typeof Bot> = { "claude-code": Terminal, cursor: Code2, codex: Bot, pi: Braces, manual: FileJson, unknown: FileJson };
  const sessionsQuery = useQuery(api.sessions.listSessions, () => ({ limit: 100 }));
  let query = $state("");
  let filter = $state("all");
  const visible = $derived((sessionsQuery.data ?? []).filter((session) => {
    const state = analysisState(session);
    const matchesFilter = filter === "all" || state === filter;
    const haystack = `${session.title} ${sessionGoal(session)} ${sourceLabels[session.source]} ${session.sourceSessionId ?? ""} ${session.dataCompleteness.confidence}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }));
  const statusColor = (status: string) => (status === "completed" ? "var(--signal-success)" : status === "failed" ? "var(--signal-danger)" : status === "active" ? "var(--signal-warning)" : "var(--signal-muted)");
</script>

<svelte:head><title>Sessions · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow eyebrow-accent mb-2">Imported runs</p>
        <h1 class="text-[28px] font-semibold tracking-tight">Sessions</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">Agent runs across every harness, scored and ready to inspect.</p>
      </div>
      <a href="/import" class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"><Plus class="size-4" />Import session</a>
    </div>

    <section class="panel overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div class="flex rounded-md border border-border bg-background p-0.5">
          {#each [["all", "All"], ["completed", "Ready"], ["active", "Active"], ["failed", "Errored"], ["unanalyzed", "Pending"]] as item}
            <button onclick={() => (filter = item[0])} class="rounded px-3 py-1 text-xs transition-colors {filter === item[0] ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}">{item[1]}</button>
          {/each}
        </div>
        <div class="relative ml-auto">
          <Search class="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input bind:value={query} placeholder="Search sessions…" class="w-56 rounded-md border border-border bg-background py-2 pl-8 pr-3 text-xs outline-none transition-colors focus:border-signal-accent" />
        </div>
      </div>
      <div class="hidden grid-cols-[1fr_120px_130px_90px] gap-4 border-b border-border px-5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:grid"><span>Session</span><span>Source</span><span>Quality</span><span>Updated</span></div>
      <div class="min-h-[320px]">
        {#if sessionsQuery.isLoading}
          {#each Array(5) as _}<div class="grid h-[73px] gap-3 border-b border-border px-5 py-4 sm:grid-cols-[1fr_120px_130px_90px]"><div class="animate-pulse"><div class="h-4 w-2/3 rounded bg-muted"></div><div class="mt-2 h-3 w-1/2 rounded bg-muted"></div></div></div>{/each}
        {:else if sessionsQuery.error}
          <div class="p-5 text-sm text-signal-danger">Failed to load sessions: {sessionsQuery.error.toString()}</div>
        {:else if visible.length}
          {#each visible as session}
            {@const Icon = icons[session.source]}
            {@const state = analysisState(session)}
            <a href="/sessions/{session.id}" class="group grid gap-3 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-accent/40 sm:grid-cols-[1fr_120px_130px_90px] sm:items-center">
              <div class="min-w-0"><div class="flex items-center gap-2"><span class="truncate text-sm font-medium">{session.title}</span><span class="font-mono text-[9px] text-muted-foreground">{session.id}</span></div><p class="truncate text-xs text-muted-foreground">{sessionGoal(session)}</p></div>
              <div class="flex items-center gap-2 text-xs text-muted-foreground"><Icon class="size-3.5" />{sourceLabels[session.source]}</div>
              <div class="flex items-center gap-2"><span class="size-2 rounded-full" style="background:{statusColor(state)}"></span><span class="tnum font-mono text-xs" style="color:{statusColor(state)}">{session.latestReport ? formatScore(session.latestReport.overallScore) : statusLabel(state)}</span></div>
              <div class="flex items-center justify-between font-mono text-[11px] text-muted-foreground"><span>{formatDate(session.updatedAt ?? session.importedAt)}</span><ChevronRight class="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
            </a>
          {/each}
        {:else}
          <div class="flex min-h-[320px] flex-col items-center justify-center p-8 text-center"><p class="text-sm font-medium">No sessions imported yet</p><p class="mt-1 text-xs text-muted-foreground">Import a trace to start reviewing agent runs.</p><a href="/import" class="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"><Plus class="size-4" />Import session</a></div>
        {/if}
      </div>
    </section>

    <div class="flex justify-between border-t border-border pt-5 font-mono text-xs text-muted-foreground">
      <span>{visible.length} sessions shown</span><span>{sessionsQuery.data?.length ?? 0} total</span>
    </div>
  </div>
</Shell>
