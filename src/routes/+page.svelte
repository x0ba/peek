<script lang="ts">
  import { ArrowUpRight } from "@lucide/svelte";
  import { Show } from "svelte-clerk";
  import { goto } from "$app/navigation";
  import Logo from "$lib/components/app/logo.svelte";
  import { LiquidMetalButton } from "$lib/components/ui/liquid-metal-button";

  // A telemetry-style trace, generated once. Calm baseline punctuated by
  // "events" (tool calls / spikes) — the black-box recorder, drawn as a line.
  const W = 1200;
  const MID = 70;
  const trace = (() => {
    let seed = 1337;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const pts: string[] = [];
    let x = 0;
    while (x <= W) {
      const wobble = Math.sin(x / 26) * 4 + Math.sin(x / 11) * 2;
      const spike = rand() > 0.94 ? (rand() - 0.5) * 84 : 0;
      const y = MID + wobble + spike;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      x += 8 + rand() * 6;
    }
    return `M ${pts.join(" L ")}`;
  })();
</script>

<svelte:head><title>Peek · The black box recorder for coding agents</title></svelte:head>

<div class="dark relative flex h-[100svh] flex-col overflow-hidden bg-background text-foreground">
  <!-- ── Atmosphere ─────────────────────────────────────────── -->
  <div class="pointer-events-none absolute -top-[34%] left-1/2 size-[1100px] -translate-x-1/2 rounded-full bg-signal-accent/[0.07] blur-[160px]"></div>
  <div class="pointer-events-none absolute -bottom-[30%] right-[-10%] size-[640px] rounded-full bg-signal-success/[0.045] blur-[150px]"></div>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-background via-background/70 to-transparent"></div>

  <!-- ── Header ─────────────────────────────────────────────── -->
  <header class="peek-rise relative z-20 mx-auto flex h-24 w-full max-w-[1180px] items-center px-6">
    <Logo />
    <nav class="ml-auto flex items-center gap-6 text-sm text-muted-foreground">
      <Show when="signed-in">
        <LiquidMetalButton label="Open dashboard" width={150} height={36} onclick={() => goto("/dashboard")} />
        {#snippet fallback()}
          <a href="/sign-in" class="transition-colors hover:text-foreground">Sign in</a>
        {/snippet}
      </Show>
    </nav>
  </header>

  <!-- ── Focal centerpiece: the live trace ──────────────────── -->
  <div class="pointer-events-none relative z-10 flex flex-[1.6] items-center justify-center">
    <div class="peek-rise relative w-full max-w-[440px] px-6" style="animation-delay: 220ms">
      <svg viewBox="0 0 {W} 140" class="h-14 w-full overflow-visible" fill="none" aria-hidden="true">
        <path d={trace} stroke="var(--signal-accent)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" class="opacity-[0.18]" />
        <path
          d={trace}
          stroke="var(--signal-accent)"
          stroke-width="1.6"
          stroke-linejoin="round"
          stroke-linecap="round"
          pathLength="1000"
          class="trace-sweep drop-shadow-[0_0_6px_color-mix(in_oklch,var(--signal-accent)_70%,transparent)]"
        />
      </svg>
    </div>
  </div>

  <!-- ── Hero: anchored bottom-left ─────────────────────────── -->
  <main class="relative z-10 mx-auto w-full max-w-[1180px] px-6 pb-[clamp(3.5rem,10vh,7rem)]">
    <h1 class="peek-rise max-w-[16ch] text-balance text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1.02] tracking-[-0.035em]" style="animation-delay: 120ms">
      The black box recorder<br class="hidden sm:block" /> for coding agents.
    </h1>
    <p class="peek-rise mt-4 max-w-md text-sm leading-6 text-muted-foreground" style="animation-delay: 180ms">
      Import a trace from Claude Code, Cursor, Codex, or anywhere else. Peek redacts secrets locally, reconstructs the run, and hands back an evidence-backed review.
    </p>
    <div class="peek-rise mt-7 flex flex-wrap items-center gap-4" style="animation-delay: 240ms">
      <Show when="signed-in">
        <LiquidMetalButton label="Open dashboard" width={186} onclick={() => goto("/dashboard")} />
        {#snippet fallback()}
          <LiquidMetalButton label="Get started" width={162} onclick={() => goto("/sign-up")} />
        {/snippet}
      </Show>
    </div>
  </main>
</div>

<style>
  /* A single bright segment travels the recorded trace — live playback. */
  .trace-sweep {
    stroke-dasharray: 150 1000;
    animation: trace-sweep 5s linear infinite;
  }
  @keyframes trace-sweep {
    from {
      stroke-dashoffset: 1150;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .trace-sweep {
      animation: none;
    }
  }
</style>
