<script lang="ts">
  import { ArrowUpRight, Bot, Braces, ChevronRight, Code2, FileJson, Plus, Search, Terminal, TrendingUp } from "@lucide/svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { demoSessions, sourceLabels } from "$lib/data/demo";
  import type { AgentSource } from "$lib/contracts/api";

  const icons: Record<AgentSource, typeof Bot> = { "claude-code": Terminal, cursor: Code2, codex: Bot, pi: Braces, manual: FileJson, unknown: FileJson };
  let query = $state("");
  let filter = $state("all");
  const visible = $derived(demoSessions.filter((session) => (filter === "all" || session.status === filter) && `${session.title} ${session.goal}`.toLowerCase().includes(query.toLowerCase())));
  const statusColor = (status: string) => (status === "completed" ? "var(--signal-success)" : status === "failed" ? "var(--signal-danger)" : status === "analyzing" ? "var(--signal-warning)" : "var(--signal-muted)");
</script>

<svelte:head><title>Dashboard · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow eyebrow-accent mb-2">Workspace overview</p>
        <h1 class="text-[28px] font-semibold tracking-tight">Agent sessions</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">Imported runs across every harness, scored and ready to inspect.</p>
      </div>
      <a href="/import" class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"><Plus class="size-4" />Import session</a>
    </div>

    <div class="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <span class="relative flex size-1.5"><span class="absolute size-full animate-ping rounded-full bg-signal-success/70"></span><span class="relative size-1.5 rounded-full bg-signal-success"></span></span>
      Redaction engine online · all systems nominal
    </div>

    <!-- Metric strip: one panel, hairline-divided -->
    <div class="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden md:grid-cols-4 md:divide-y-0">
      {#each [["Sessions", "128", "+12"], ["Analyzed", "104", "+9"], ["Avg quality", "4.1", "+0.3"], ["Avg confidence", "High", "82%"]] as metric}
        <div class="px-5 py-4">
          <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{metric[0]}</p>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="tnum text-2xl font-semibold">{metric[1]}</span>
            <span class="flex items-center font-mono text-[11px] text-signal-success"><ArrowUpRight class="size-3" />{metric[2]}</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="grid gap-x-10 gap-y-8 lg:grid-cols-[1fr_280px]">
      <!-- Sessions table: the single focal surface -->
      <section id="sessions" class="panel overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div class="flex rounded-md border border-border bg-background p-0.5">
            {#each [["all", "All"], ["completed", "Ready"], ["analyzing", "Active"], ["failed", "Errored"]] as item}
              <button onclick={() => (filter = item[0])} class="rounded px-3 py-1 text-xs transition-colors {filter === item[0] ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}">{item[1]}</button>
            {/each}
          </div>
          <div class="relative ml-auto">
            <Search class="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input bind:value={query} placeholder="Search sessions…" class="w-56 rounded-md border border-border bg-background py-2 pl-8 pr-3 text-xs outline-none transition-colors focus:border-signal-accent" />
          </div>
        </div>
        <div class="hidden grid-cols-[1fr_120px_130px_90px] gap-4 border-b border-border px-5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:grid"><span>Session</span><span>Source</span><span>Quality</span><span>Updated</span></div>
        {#each visible as session}
          {@const Icon = icons[session.source]}
          <a href="/sessions/{session.id}" class="group grid gap-3 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-accent/40 sm:grid-cols-[1fr_120px_130px_90px] sm:items-center">
            <div class="min-w-0">
              <div class="flex items-center gap-2"><span class="truncate text-sm font-medium">{session.title}</span><span class="font-mono text-[9px] text-muted-foreground">{session.id}</span></div>
              <p class="truncate text-xs text-muted-foreground">{session.goal}</p>
            </div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground"><Icon class="size-3.5" />{sourceLabels[session.source]}</div>
            <div class="flex items-center gap-2"><span class="size-2 rounded-full" style="background:{statusColor(session.status)}"></span><span class="tnum font-mono text-xs" style="color:{statusColor(session.status)}">{session.score?.toFixed(1) ?? session.status}</span></div>
            <div class="flex items-center justify-between font-mono text-[11px] text-muted-foreground"><span>{session.updated}</span><ChevronRight class="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
          </a>
        {/each}
      </section>

      <!-- Aside: flat sections on the canvas, no nested boxes -->
      <aside class="space-y-8">
        <section>
          <div class="mb-4 flex items-center justify-between"><h2 class="eyebrow">Source mix</h2><span class="font-mono text-[10px] text-muted-foreground">30 DAYS</span></div>
          <div class="flex h-2 overflow-hidden rounded-full">
            <span class="w-[42%] bg-signal-accent"></span><span class="w-[28%] bg-signal-success"></span><span class="w-[20%] bg-signal-warning"></span><span class="w-[10%] bg-muted"></span>
          </div>
          <ul class="mt-4 divide-y divide-border">
            {#each [["Claude", "42%"], ["Cursor", "28%"], ["Codex", "20%"], ["Other", "10%"]] as source}
              <li class="flex justify-between py-2 text-xs text-muted-foreground"><span>{source[0]}</span><span class="tnum font-mono">{source[1]}</span></li>
            {/each}
          </ul>
        </section>

        <section>
          <h2 class="eyebrow mb-4">Common risks</h2>
          <div class="space-y-3">
            {#each [["No test evidence", "14", "warning"], ["Unreviewed file scope", "8", "danger"], ["Repeated tool errors", "6", "warning"]] as risk}
              <div class="flex items-center gap-2.5 text-xs"><span class="size-1.5 rounded-full bg-signal-{risk[2]}"></span><span class="text-muted-foreground">{risk[0]}</span><span class="tnum ml-auto font-mono">{risk[1]}</span></div>
            {/each}
          </div>
        </section>
      </aside>
    </div>

    <div class="flex justify-between border-t border-border pt-5 text-xs text-muted-foreground">
      <span class="font-mono">{visible.length} sessions shown</span>
      <span class="flex items-center gap-1.5"><TrendingUp class="size-3.5" />Quality trending up 7% this week</span>
    </div>
  </div>
</Shell>
