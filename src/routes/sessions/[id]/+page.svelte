<script lang="ts">
  import { AlertTriangle, ArrowLeft, Check, ChevronRight, Clock3, FileCode2, Play, ShieldAlert, Terminal, Trash2, X } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { useConvexClient, useQuery } from "convex-svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { api } from "$convex/_generated/api";
  import type { Id } from "$convex/_generated/dataModel";
  import { analysisState, completenessItems, formatConfidence, formatDate, formatScore, sessionGoal, statusLabel } from "$lib/sessions/view-model";

  const client = useConvexClient();
  const sessionId = $derived(page.params.id as Id<"sessions">);
  const sessionQuery = useQuery(api.sessions.getSession, () => ({ sessionId }));
  const reportQuery = useQuery(api.analysis.getLatestReport, () => ({ sessionId }));
  let busy = $state(false);

  async function runAnalysis() {
    if (!sessionQuery.data || busy) return;
    busy = true;
    try {
      const state = analysisState(sessionQuery.data);
      if (state === "failed" && sessionQuery.data.latestJob) await client.mutation(api.analysis.retryAnalysisJob, { jobId: sessionQuery.data.latestJob.id });
      else await client.mutation(api.analysis.createAnalysisJob, { sessionId });
    } finally {
      busy = false;
    }
  }

  async function deleteSession() {
    if (!confirm("Delete this imported session and its stored trace?")) return;
    await client.mutation(api.sessions.deleteSession, { sessionId });
    await goto("/sessions");
  }

  const statusColor = (status: string) => (status === "completed" ? "var(--signal-success)" : status === "failed" ? "var(--signal-danger)" : status === "active" ? "var(--signal-warning)" : "var(--signal-muted)");
</script>

<svelte:head><title>{sessionQuery.data?.title ?? "Session"} · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise space-y-8">
    <a href="/sessions" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft class="size-3.5" />All sessions</a>

    {#if sessionQuery.isLoading}
      <div class="space-y-8"><div class="h-24 animate-pulse rounded bg-muted"></div><div class="panel h-[96px] animate-pulse"></div><div class="grid gap-10 lg:grid-cols-[1fr_320px]"><div class="h-80 animate-pulse rounded bg-muted"></div><div class="h-80 animate-pulse rounded bg-muted"></div></div></div>
    {:else if sessionQuery.error}
      <div class="panel p-5 text-sm text-signal-danger">Failed to load session: {sessionQuery.error.toString()}</div>
    {:else if !sessionQuery.data}
      <div class="panel p-8 text-center"><h1 class="text-lg font-medium">Session not found</h1><p class="mt-2 text-sm text-muted-foreground">This session may have been deleted or belongs to another workspace.</p><a href="/sessions" class="mt-5 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Back to sessions</a></div>
    {:else}
      {@const session = sessionQuery.data}
      {@const report = reportQuery.data}
      {@const state = analysisState(session)}
      <div class="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div class="flex flex-wrap items-center gap-2.5"><h1 class="text-[28px] font-semibold tracking-tight">{session.title}</h1><span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]" style="color:{statusColor(state)}"><span class="size-1.5 rounded-full" style="background:{statusColor(state)}"></span>{statusLabel(state).toUpperCase()}</span></div>
          <p class="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">{sessionGoal(session, report)}</p>
          <p class="mt-3 font-mono text-[11px] text-muted-foreground">{session.id} · imported {formatDate(session.importedAt)}</p>
        </div>
        <div class="flex gap-2"><button onclick={deleteSession} class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"><Trash2 class="size-3.5" />Delete</button><button onclick={runAnalysis} disabled={busy || state === "active" || state === "completed"} class="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"><Play class="size-3.5" />{state === "active" ? "Analysis running" : state === "failed" ? "Retry analysis" : state === "completed" ? "Analysis complete" : "Run baseline analysis"}</button></div>
      </div>

      {#if state === "active"}<div class="panel border-signal-warning/25 bg-signal-warning/[0.05] p-4"><div class="flex items-center gap-3"><span class="size-2 animate-pulse rounded-full bg-signal-warning"></span><div><p class="text-sm font-medium">{session.latestJob?.progressMessage ?? "Scoring trace evidence"}</p><p class="text-xs text-muted-foreground">You can leave this page; analysis will continue.</p></div></div><div class="mt-3 h-1 overflow-hidden rounded bg-muted"><div class="h-full w-2/3 bg-signal-warning"></div></div></div>{/if}

      <div class="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        {#each [["Quality", formatScore(session.latestReport?.overallScore)], ["Confidence", formatConfidence(session.dataCompleteness.confidence)], ["Messages", session.stats.messageCount], ["Tool calls", session.stats.toolCallCount], ["Files touched", session.stats.filesTouchedCount]] as stat}<div class="px-5 py-4"><p class="text-[11px] uppercase tracking-wide text-muted-foreground">{stat[0]}</p><p class="tnum mt-2 text-2xl font-semibold capitalize">{stat[1]}</p></div>{/each}
      </div>

      <div class="grid gap-x-10 gap-y-10 lg:grid-cols-[1fr_320px]">
        <div class="space-y-10">
          {#if report}<section><div class="flex items-start justify-between gap-4"><div><p class="eyebrow eyebrow-accent">Analysis report</p><h2 class="mt-1.5 max-w-md text-lg font-medium leading-snug">{report.qualityAssessment.summary}</h2></div><div class="text-right"><span class="tnum text-4xl font-semibold text-signal-success">{formatScore(report.qualityAssessment.overallScore)}</span><span class="block font-mono text-[10px] text-muted-foreground">/ 5.0</span></div></div><p class="mt-5 max-w-prose text-sm leading-7 text-muted-foreground">{report.executiveSummary}</p></section>{/if}
          <section><h2 class="eyebrow mb-4">Condensed trace</h2><ol class="panel divide-y divide-border overflow-hidden">{#each (report?.condensedTimeline ?? session.messagesPreview.map((message, index) => ({ order: index + 1, title: `${message.role} message`, detail: message.content, relatedIds: [message.id] })).slice(0, 8)) as item}<li class="grid grid-cols-[36px_1fr] gap-3 px-5 py-4"><span class="font-mono text-xs text-signal-accent">{String(item.order).padStart(2, "0")}</span><div><p class="text-sm font-medium">{item.title}</p><p class="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div></li>{/each}</ol></section>
          {#if report?.whatWentWell?.length}<section><h2 class="eyebrow mb-4">What went well</h2><div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">{#each report.whatWentWell as finding}<div class="border-l-2 border-signal-success/60 pl-4"><p class="text-sm font-medium">{finding.title}</p><p class="mt-1 text-xs leading-5 text-muted-foreground">{finding.detail}</p></div>{/each}</div></section>{/if}
        </div>
        <aside class="space-y-8">
          {#if report?.rubricScores?.length}<section><h2 class="eyebrow mb-4">Rubric</h2><div class="space-y-3.5">{#each report.rubricScores as item}<div><div class="mb-1.5 flex justify-between text-xs"><span class="text-muted-foreground">{item.dimension}</span><span class="tnum font-mono">{item.score.toFixed(1)}</span></div><div class="h-1 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-signal-success" style="width:{(item.score / 5) * 100}%"></div></div></div>{/each}</div></section>{/if}
          {#if report?.risks?.[0]}<section class="panel border-signal-warning/25 p-5"><div class="flex items-center gap-2"><ShieldAlert class="size-4 text-signal-warning" /><h2 class="text-sm font-medium">Risk flagged</h2></div><p class="mt-4 text-sm font-medium">{report.risks[0].title}</p><p class="mt-1 text-xs leading-5 text-muted-foreground">{report.risks[0].detail}</p><p class="mt-4 border-t border-border pt-4 text-xs leading-5 text-signal-warning"><span class="font-medium">Mitigation:</span> {report.risks[0].mitigation}</p></section>{/if}
          <section><h2 class="eyebrow mb-4">Data completeness</h2><div class="space-y-3 text-xs">{#each completenessItems(session.dataCompleteness) as item}<div class="flex items-center gap-2.5">{#if item[1]}<Check class="size-3.5 text-signal-success" />{:else}<X class="size-3.5 text-signal-warning" />{/if}<span class="text-muted-foreground">{item[0]}</span><ChevronRight class="ml-auto size-3 text-muted-foreground/60" /></div>{/each}</div><div class="mt-4 flex items-center gap-2 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground"><Clock3 class="size-3" />{formatConfidence(session.dataCompleteness.confidence).toUpperCase()} CONFIDENCE</div></section>
          {#if session.dataCompleteness.warnings.length}<section><h2 class="eyebrow mb-4">Import warnings</h2><div class="space-y-2">{#each session.dataCompleteness.warnings as warning}<p class="flex gap-2 text-xs text-muted-foreground"><AlertTriangle class="size-3.5 shrink-0 text-signal-warning" />{warning}</p>{/each}</div></section>{/if}
        </aside>
      </div>
    {/if}
  </div>
</Shell>
