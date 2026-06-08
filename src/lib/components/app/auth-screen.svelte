<script lang="ts">
  import { ShieldCheck } from "@lucide/svelte";
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
</script>

<div class="theme-auto relative flex min-h-[100svh] flex-col overflow-hidden bg-background text-foreground">
  <!-- ── Atmosphere — same vocabulary as the landing page ─────── -->
  <div class="pointer-events-none absolute -top-[32%] left-1/2 size-[1000px] -translate-x-1/2 rounded-full bg-signal-accent/[0.06] blur-[160px]"></div>
  <div class="pointer-events-none absolute -bottom-[34%] right-[-12%] size-[600px] rounded-full bg-signal-success/[0.04] blur-[150px]"></div>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-background via-background/70 to-transparent"></div>

  <!-- ── Header: just the mark, like the landing page ─────────── -->
  <header class="relative z-20 mx-auto flex h-24 w-full max-w-[1180px] items-center px-6">
    <Logo />
  </header>

  <!-- ── The form, floating in negative space ─────────────────── -->
  <main class="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
    <div class="w-full max-w-[24rem]">
      <p class="eyebrow eyebrow-accent mb-2.5">{eyebrow}</p>
      <h1 class="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em]">{title}</h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>

      <div class="mt-9">
        {@render form()}
      </div>
    </div>
  </main>

  <!-- ── One quiet trust line grounds the bottom ──────────────── -->
  <footer class="relative z-10 flex items-center justify-center gap-2 pb-9 font-mono text-[11px] text-muted-foreground">
    <ShieldCheck class="size-3.5 text-signal-success" /> redaction runs in your browser, not ours
  </footer>
</div>
