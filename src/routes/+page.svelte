<script lang="ts">
  import { ArrowRight, Bot, Check, FileSearch, LockKeyhole, Radar, ShieldCheck, Terminal } from "@lucide/svelte";
  import Logo from "$lib/components/app/logo.svelte";
</script>

<svelte:head><title>Peek · Agent trace analyzer</title></svelte:head>

<div class="dark min-h-screen overflow-hidden bg-background text-foreground">
  <header class="relative z-10 mx-auto flex h-20 max-w-[1180px] items-center px-5">
    <Logo />
    <nav class="ml-auto hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
      <a href="#workflow" class="hover:text-foreground">Workflow</a>
      <a href="#privacy" class="hover:text-foreground">Privacy</a>
      <a href="/dashboard" class="rounded-md border border-border px-3 py-2 text-foreground hover:bg-accent">Open dashboard</a>
    </nav>
  </header>

  <main>
    <section class="relative mx-auto grid min-h-[680px] max-w-[1180px] items-center gap-16 px-5 py-20 lg:grid-cols-[1.05fr_.95fr]">
      <div class="pointer-events-none absolute -top-48 left-1/3 size-[720px] rounded-full bg-signal-accent/[0.055] blur-[120px]"></div>
      <div class="peek-rise relative">
        <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-signal-success/25 bg-signal-success/[0.06] px-3 py-1.5 font-mono text-[11px] text-signal-success">
          <span class="size-1.5 rounded-full bg-signal-success shadow-[0_0_8px_var(--signal-success)]"></span>
          YOUR AGENT RAN. NOW SEE WHAT HAPPENED.
        </div>
        <h1 class="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl">The black box recorder for coding agents.</h1>
        <p class="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">Import traces from Claude Code, Cursor, Codex, Pi, or anywhere else. Peek redacts sensitive data locally, reconstructs the run, and delivers an evidence-backed review.</p>
        <div class="mt-9 flex flex-wrap gap-3">
          <a href="/import" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Import a session <ArrowRight class="size-4" /></a>
          <a href="/dashboard" class="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent">View demo dashboard</a>
        </div>
        <div class="mt-9 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1.5"><Check class="size-3 text-signal-success" /> local redaction</span>
          <span class="flex items-center gap-1.5"><Check class="size-3 text-signal-success" /> normalized traces</span>
          <span class="flex items-center gap-1.5"><Check class="size-3 text-signal-success" /> evidence-linked scores</span>
        </div>
      </div>

      <div class="peek-rise relative" style="animation-delay: 100ms">
        <div class="absolute -inset-4 rounded-3xl bg-gradient-to-br from-signal-accent/10 via-transparent to-signal-success/5 blur-2xl"></div>
        <div class="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black">
          <div class="flex items-center border-b border-border px-4 py-3">
            <div class="flex gap-1.5"><span class="size-2.5 rounded-full bg-white/10"></span><span class="size-2.5 rounded-full bg-white/10"></span><span class="size-2.5 rounded-full bg-white/10"></span></div>
            <span class="mx-auto font-mono text-[10px] text-muted-foreground">ses_9f3a1c · analysis</span>
          </div>
          <div class="grid grid-cols-[46px_1fr]">
            <div class="border-r border-border py-5 text-center font-mono text-[10px] leading-8 text-muted-foreground/40">01<br />02<br />03<br />04<br />05<br />06<br />07</div>
            <div class="space-y-5 p-5">
              <div class="flex items-start justify-between">
                <div><p class="text-xs text-muted-foreground">OVERALL QUALITY</p><p class="mt-1 text-4xl font-semibold">4.6<span class="text-base text-muted-foreground"> / 5</span></p></div>
                <span class="rounded border border-signal-success/25 bg-signal-success/10 px-2 py-1 font-mono text-[10px] text-signal-success">HIGH CONFIDENCE</span>
              </div>
              <div class="grid grid-cols-5 gap-1">{#each [1,2,3,4,5] as bar}<span class="h-1 rounded-full {bar < 5 ? 'bg-signal-success' : 'bg-muted'}"></span>{/each}</div>
              <div class="border-l-2 border-signal-accent pl-3"><p class="text-xs font-medium">Goal reconstructed</p><p class="mt-1 text-xs leading-5 text-muted-foreground">Build a guided import flow with redaction, validation, and a usable session preview.</p></div>
              <div class="space-y-2 font-mono text-[11px]">
                <div class="flex justify-between border-b border-border pb-2"><span class="text-muted-foreground">42 messages</span><span class="text-signal-success">complete</span></div>
                <div class="flex justify-between border-b border-border pb-2"><span class="text-muted-foreground">24 tool calls</span><span>3 errors recovered</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">12 files touched</span><span class="text-signal-warning">1 risk flagged</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="workflow" class="border-y border-border bg-card/50">
      <div class="mx-auto grid max-w-[1180px] divide-y divide-border px-5 md:grid-cols-3 md:divide-x md:divide-y-0">
        {#each [
          { icon: FileSearch, n: "01", title: "Import any trace", copy: "Files, folders, JSONL, Markdown, or pasted transcripts from every major harness." },
          { icon: ShieldCheck, n: "02", title: "Redact before upload", copy: "Keys, tokens, emails, local paths, and secrets are detected in your browser." },
          { icon: Radar, n: "03", title: "Inspect the evidence", copy: "Scores, risks, recommendations, and a reconstructed timeline link back to the trace." }
        ] as item}
          <div class="py-10 md:px-8 first:pl-0 last:pr-0">
            <div class="flex items-center justify-between"><item.icon class="size-5 text-signal-accent" /><span class="font-mono text-xs text-muted-foreground">{item.n}</span></div>
            <h2 class="mt-8 text-lg font-medium">{item.title}</h2><p class="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
          </div>
        {/each}
      </div>
    </section>

    <section id="privacy" class="mx-auto max-w-[1180px] px-5 py-24">
      <div class="grid gap-10 rounded-xl border border-border bg-card p-7 lg:grid-cols-[1fr_1.4fr] lg:p-12">
        <div><LockKeyhole class="size-7 text-signal-success" /><h2 class="mt-5 text-3xl font-semibold tracking-tight">Your source code deserves a careful boundary.</h2></div>
        <div class="grid gap-5 sm:grid-cols-2">
          {#each ["Redaction happens before upload", "Raw secret values are never stored", "Delete sessions and reports anytime", "Only normalized traces reach analysis"] as line}
            <div class="flex gap-3 border-t border-border pt-4"><Check class="mt-0.5 size-4 shrink-0 text-signal-success" /><span class="text-sm text-muted-foreground">{line}</span></div>
          {/each}
        </div>
      </div>
    </section>
  </main>
  <footer class="mx-auto flex max-w-[1180px] items-center border-t border-border px-5 py-7 text-xs text-muted-foreground"><Terminal class="mr-2 size-3.5" /> Peek · trace observability for agentic software work <Bot class="ml-auto size-4" /></footer>
</div>
