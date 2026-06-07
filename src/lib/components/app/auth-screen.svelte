<script lang="ts">
  import { Check, ShieldCheck } from "@lucide/svelte";
  import Logo from "./logo.svelte";
  import type { Snippet } from "svelte";

  let {
    eyebrow,
    title,
    subtitle,
    form,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    form: Snippet;
  } = $props();

  const assurances = [
    "Local redaction before any upload",
    "Raw secret values are never stored",
    "Delete sessions and reports anytime",
  ];
</script>

<div class="dark relative grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
  <!-- Brand / value column -->
  <aside class="relative hidden flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
    <div class="canvas-grid pointer-events-none absolute inset-x-0 top-0 h-[480px]"></div>
    <div class="pointer-events-none absolute -left-32 top-1/4 size-[620px] rounded-full bg-signal-accent/[0.06] blur-[130px]"></div>

    <div class="relative">
      <Logo />
    </div>

    <div class="peek-rise relative max-w-md">
      <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-signal-success/25 bg-signal-success/[0.06] px-3 py-1.5 font-mono text-[11px] text-signal-success">
        <span class="size-1.5 rounded-full bg-signal-success shadow-[0_0_8px_var(--signal-success)]"></span>
        THE BLACK BOX RECORDER FOR CODING AGENTS
      </div>
      <h2 class="text-4xl font-semibold leading-[1.05] tracking-[-0.04em]">
        See what your agent<br />actually did.
      </h2>
      <p class="mt-5 text-[15px] leading-7 text-muted-foreground">
        Import a trace from Claude Code, Cursor, Codex, or Pi. Peek reconstructs the run and delivers an evidence-backed review — scores, risks, and what to fix next time.
      </p>

      <ul class="mt-9 space-y-3">
        {#each assurances as line}
          <li class="flex items-center gap-3 text-sm text-muted-foreground">
            <Check class="size-4 shrink-0 text-signal-success" />{line}
          </li>
        {/each}
      </ul>
    </div>

    <div class="relative flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
      <ShieldCheck class="size-3.5 text-signal-success" /> redaction runs in your browser, not ours
    </div>
  </aside>

  <!-- Form column -->
  <main class="relative flex items-center justify-center px-5 py-14 sm:px-10">
    <div class="canvas-grid pointer-events-none absolute inset-x-0 top-0 -z-0 h-[280px] lg:hidden"></div>
    <div class="peek-rise relative z-10 w-full max-w-[26rem]">
      <div class="mb-8 lg:hidden"><Logo /></div>
      <p class="eyebrow eyebrow-accent mb-2">{eyebrow}</p>
      <h1 class="text-[26px] font-semibold tracking-tight">{title}</h1>
      <p class="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

      <div class="mt-8">
        {@render form()}
      </div>
    </div>
  </main>
</div>
