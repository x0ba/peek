<script lang="ts">
  import { AlertTriangle, ArrowLeft, Check, ChevronRight, Clock3, FileCode2, Play, ShieldAlert, Terminal, Trash2 } from "@lucide/svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { demoSessions } from "$lib/data/demo";
  import { page } from "$app/state";

  const session = $derived(demoSessions.find((item) => item.id === page.params.id) ?? demoSessions[0]);
  let analyzing = $state(false);
  const rubric = [["Goal alignment", 4.8], ["Completeness", 4.5], ["Correctness confidence", 4.2], ["Efficiency", 4.0], ["Tool-use quality", 4.7], ["Collaboration", 4.6], ["Risk management", 4.3]] as const;
  const trace = [
    ["01", "Goal established", "User requested implementation of the product plan while preserving the current aesthetic."],
    ["02", "Repository inspected", "Agent read the plan, existing Svelte routes, design tokens, and project contract."],
    ["03", "Implementation", "Shared shell, dashboard, import wizard, redaction, and report views were added."],
    ["04", "Validation", "Type checks, formatting, and focused interaction verification were completed."],
  ];
  const wins = [
    ["Inspected before editing", "The implementation followed established component and color patterns."],
    ["Kept evidence visible", "Warnings, confidence, and analysis claims remain tied to trace data."],
  ];
  const completeness = [[Check, "Timestamps", "success"], [Check, "Tool events", "success"], [FileCode2, "File changes", "success"], [Terminal, "Command output", "success"], [AlertTriangle, "Model tokens unavailable", "warning"]] as const;
</script>

<svelte:head><title>{session.title} · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <a href="/sessions" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft class="size-3.5" />All sessions</a>

    <!-- Title row -->
    <div class="flex flex-wrap items-start justify-between gap-5">
      <div>
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-[28px] font-semibold tracking-tight">{session.title}</h1>
          <span class="inline-flex items-center gap-1.5 rounded-full border border-signal-success/25 bg-signal-success/10 px-2.5 py-1 font-mono text-[10px] text-signal-success">
            <span class="size-1.5 rounded-full bg-signal-success shadow-[0_0_6px_var(--signal-success)]"></span>ANALYZED
          </span>
        </div>
        <p class="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">{session.goal}</p>
        <p class="mt-3 font-mono text-[11px] text-muted-foreground">{session.id} · {session.duration} · imported {session.updated}</p>
      </div>
      <div class="flex gap-2">
        <button class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"><Trash2 class="size-3.5" />Delete</button>
        <button onclick={() => (analyzing = !analyzing)} class="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"><Play class="size-3.5" />{analyzing ? "Analysis running" : "Re-run analysis"}</button>
      </div>
    </div>

    {#if analyzing}
      <div class="panel border-signal-warning/25 bg-signal-warning/[0.05] p-4">
        <div class="flex items-center gap-3">
          <span class="size-2 animate-pulse rounded-full bg-signal-warning"></span>
          <div><p class="text-sm font-medium">Scoring trace evidence</p><p class="text-xs text-muted-foreground">You can leave this page; analysis will continue.</p></div>
          <span class="ml-auto font-mono text-xs text-signal-warning">68%</span>
        </div>
        <div class="mt-3 h-1 overflow-hidden rounded bg-muted"><div class="h-full w-[68%] bg-signal-warning"></div></div>
      </div>
    {/if}

    <!-- Stat strip: one panel, hairline-divided cells -->
    <div class="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
      {#each [["Quality", session.score?.toFixed(1) ?? "—"], ["Confidence", session.confidence], ["Messages", session.turns], ["Tool calls", session.tools], ["Files touched", session.files]] as stat}
        <div class="px-5 py-4">
          <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{stat[0]}</p>
          <p class="tnum mt-2 text-2xl font-semibold capitalize">{stat[1]}</p>
        </div>
      {/each}
    </div>

    <div class="grid gap-x-10 gap-y-10 lg:grid-cols-[1fr_320px]">
      <!-- Main column: flat sections on the canvas -->
      <div class="space-y-10">
        <!-- Report -->
        <section>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="eyebrow eyebrow-accent">Analysis report</p>
              <h2 class="mt-1.5 max-w-md text-lg font-medium leading-snug">A complete implementation with strong trace discipline</h2>
            </div>
            <div class="text-right">
              <span class="tnum text-4xl font-semibold text-signal-success">4.6</span>
              <span class="block font-mono text-[10px] text-muted-foreground">/ 5.0</span>
            </div>
          </div>
          <p class="mt-5 max-w-prose text-sm leading-7 text-muted-foreground">
            The agent correctly reconstructed the requested product, preserved the existing visual language, and implemented the core user flows. It inspected the repository before editing and validated the result. Confidence is reduced slightly by limited browser-level interaction evidence.
          </p>
        </section>

        <!-- Condensed trace -->
        <section>
          <h2 class="eyebrow mb-4">Condensed trace</h2>
          <ol class="panel divide-y divide-border overflow-hidden">
            {#each trace as item}
              <li class="grid grid-cols-[36px_1fr] gap-3 px-5 py-4">
                <span class="font-mono text-xs text-signal-accent">{item[0]}</span>
                <div><p class="text-sm font-medium">{item[1]}</p><p class="mt-1 text-xs leading-5 text-muted-foreground">{item[2]}</p></div>
              </li>
            {/each}
          </ol>
        </section>

        <!-- What went well -->
        <section>
          <h2 class="eyebrow mb-4">What went well</h2>
          <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {#each wins as finding}
              <div class="border-l-2 border-signal-success/60 pl-4">
                <p class="text-sm font-medium">{finding[0]}</p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">{finding[1]}</p>
              </div>
            {/each}
          </div>
        </section>
      </div>

      <!-- Aside: each panel is a single elevation level -->
      <aside class="space-y-8">
        <!-- Rubric -->
        <section>
          <h2 class="eyebrow mb-4">Rubric</h2>
          <div class="space-y-3.5">
            {#each rubric as item}
              <div>
                <div class="mb-1.5 flex justify-between text-xs"><span class="text-muted-foreground">{item[0]}</span><span class="tnum font-mono">{item[1].toFixed(1)}</span></div>
                <div class="h-1 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-signal-success" style="width:{(item[1] / 5) * 100}%"></div></div>
              </div>
            {/each}
          </div>
        </section>

        <!-- Risk -->
        <section class="panel border-signal-warning/25 p-5">
          <div class="flex items-center gap-2"><ShieldAlert class="size-4 text-signal-warning" /><h2 class="text-sm font-medium">Risk flagged</h2></div>
          <p class="mt-4 text-sm font-medium">Limited end-to-end evidence</p>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">Static validation passed, but the trace did not capture a complete authenticated import against the production backend.</p>
          <p class="mt-4 border-t border-border pt-4 text-xs leading-5 text-signal-warning"><span class="font-medium">Mitigation:</span> add browser tests once Clerk and Convex are configured.</p>
        </section>

        <!-- Data completeness -->
        <section>
          <h2 class="eyebrow mb-4">Data completeness</h2>
          <div class="space-y-3 text-xs">
            {#each completeness as item}
              <div class="flex items-center gap-2.5">
                <svelte:component this={item[0]} class="size-3.5 text-signal-{item[2]}" />
                <span class="text-muted-foreground">{item[1]}</span>
                <ChevronRight class="ml-auto size-3 text-muted-foreground/60" />
              </div>
            {/each}
          </div>
          <div class="mt-4 flex items-center gap-2 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground"><Clock3 class="size-3" />HIGH CONFIDENCE</div>
        </section>
      </aside>
    </div>
  </div>
</Shell>
