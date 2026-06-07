<script lang="ts">
  import { ArrowUpRight, ChevronRight, Plus, TrendingUp } from "@lucide/svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { demoSessions } from "$lib/data/demo";

  const recent = demoSessions.slice(0, 4);
  const statusColor = (status: string) => (status === "completed" ? "var(--signal-success)" : status === "failed" ? "var(--signal-danger)" : status === "analyzing" ? "var(--signal-warning)" : "var(--signal-muted)");
</script>

<svelte:head><title>Overview · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <!-- Header -->
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
      <!-- Recent activity: a peek into the full Sessions route -->
      <section>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="eyebrow">Recent activity</h2>
          <a href="/sessions" class="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">VIEW ALL<ChevronRight class="size-3" /></a>
        </div>
        <ul class="divide-y divide-border">
          {#each recent as session}
            <li>
              <a href="/sessions/{session.id}" class="group flex items-center gap-3 py-3 transition-colors hover:text-foreground">
                <span class="size-2 shrink-0 rounded-full" style="background:{statusColor(session.status)}"></span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{session.title}</p>
                  <p class="truncate text-xs text-muted-foreground">{session.goal}</p>
                </div>
                <span class="tnum shrink-0 font-mono text-xs" style="color:{statusColor(session.status)}">{session.score?.toFixed(1) ?? session.status}</span>
                <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{session.updated}</span>
                <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            </li>
          {/each}
        </ul>
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
      <span class="font-mono">{demoSessions.length} sessions tracked</span>
      <span class="flex items-center gap-1.5"><TrendingUp class="size-3.5" />Quality trending up 7% this week</span>
    </div>
  </div>
</Shell>
