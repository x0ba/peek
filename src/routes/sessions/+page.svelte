<script lang="ts">
  import { Bot, Braces, ChevronRight, Code2, FileJson, Plus, Search, Terminal } from "@lucide/svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { demoSessions, sourceLabels } from "$lib/data/demo";
  import type { AgentSource } from "$lib/contracts/api";

  const icons: Record<AgentSource, typeof Bot> = { "claude-code": Terminal, cursor: Code2, codex: Bot, pi: Braces, manual: FileJson, unknown: FileJson };
  let query = $state("");
  let filter = $state("all");
  const visible = $derived(demoSessions.filter((session) => (filter === "all" || session.status === filter) && `${session.title} ${session.goal}`.toLowerCase().includes(query.toLowerCase())));
  const statusColor = (status: string) => (status === "completed" ? "var(--signal-success)" : status === "failed" ? "var(--signal-danger)" : status === "analyzing" ? "var(--signal-warning)" : "var(--signal-muted)");
</script>

<svelte:head><title>Sessions · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow eyebrow-accent mb-2">Imported runs</p>
        <h1 class="text-[28px] font-semibold tracking-tight">Sessions</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">Agent runs across every harness, scored and ready to inspect.</p>
      </div>
      <a href="/import" class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"><Plus class="size-4" />Import session</a>
    </div>

    <!-- Sessions table: the single focal surface -->
    <section class="panel overflow-hidden">
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

    <div class="flex justify-between border-t border-border pt-5 font-mono text-xs text-muted-foreground">
      <span>{visible.length} sessions shown</span>
      <span>{demoSessions.length} total</span>
    </div>
  </div>
</Shell>
