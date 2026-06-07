<script lang="ts">
  import { ArrowLeft, ArrowRight, Bot, Braces, Check, ClipboardPaste, Code2, FileJson, FileUp, ShieldCheck, Terminal, UploadCloud } from "@lucide/svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { parseTranscript } from "$lib/importers/parse";
  import { redactText } from "$lib/redaction/redact";
  import type { AgentSource } from "$lib/contracts/api";

  const sources = [
    { id: "claude-code", label: "Claude Code", detail: "Project history and JSONL traces", icon: Terminal },
    { id: "cursor", label: "Cursor", detail: "Chat and composer exports", icon: Code2 },
    { id: "codex", label: "Codex", detail: "CLI sessions and trace events", icon: Bot },
    { id: "pi", label: "Pi", detail: "Session logs and tool traces", icon: Braces },
    { id: "manual", label: "Other / manual", detail: "JSON, Markdown, or plain text", icon: FileJson },
  ] as const;
  const labels = ["Source", "Data input", "Detected", "Redaction", "Preview", "Complete"];
  let step = $state(1);
  let source = $state<AgentSource>("claude-code");
  let text = $state("User: Build a SvelteKit import wizard and preserve the current visual design.\nAssistant: I’ll inspect the repository and product plan first.\nTool: Read plans/product-plan.md\nAssistant: I implemented the source picker, transcript parser, and redaction preview. Validation passed.");
  let reviewed = $state(false);
  let fileName = $state("");
  const parsed = $derived(parseTranscript(text, source));
  const preview = $derived(redactText(text));

  async function readFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    fileName = file.name;
    text = await file.text();
  }
  function next() {
    if (step === 4 && !reviewed) return;
    step = Math.min(6, step + 1);
  }
</script>

<svelte:head><title>Import session · Peek</title></svelte:head>
<Shell>
  <div class="peek-rise mx-auto max-w-4xl space-y-8">
    <header>
      <p class="eyebrow eyebrow-accent mb-2">Local-first ingestion</p>
      <h1 class="text-[28px] font-semibold tracking-tight">Import agent session</h1>
      <p class="mt-1.5 text-sm text-muted-foreground">Parse and redact the trace in your browser before anything is uploaded.</p>
    </header>

    <!-- Progress rail — lives on the canvas, no box -->
    <ol class="flex items-center gap-2 overflow-x-auto pb-1">
      {#each labels as label, index}
        {@const state = step > index + 1 ? "done" : step === index + 1 ? "current" : "todo"}
        <li class="flex shrink-0 items-center gap-2">
          <span class="flex size-5 items-center justify-center rounded-full border text-[10px] font-medium transition-colors {state === 'done' ? 'border-signal-success bg-signal-success text-background' : state === 'current' ? 'border-signal-accent text-signal-accent' : 'border-border text-muted-foreground'}">
            {#if state === "done"}<Check class="size-3" />{:else}{index + 1}{/if}
          </span>
          <span class="hidden text-xs sm:block {state === 'current' ? 'font-medium text-foreground' : 'text-muted-foreground'}">{label}</span>
          {#if index < labels.length - 1}<span class="h-px w-5 bg-border sm:w-8"></span>{/if}
        </li>
      {/each}
    </ol>

    <section class="panel min-h-[460px] p-6 sm:p-8">
      {#if step === 1}
        <div><h2 class="text-lg font-medium">Where did this session run?</h2><p class="mt-1 text-sm text-muted-foreground">Source-specific parsing runs first, with tolerant fallback detection.</p></div>
        <div class="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each sources as item}
            <button onclick={() => (source = item.id)} class="group min-h-32 rounded-lg border p-4 text-left transition-colors {source === item.id ? 'border-signal-accent bg-signal-accent/[0.06]' : 'border-border hover:border-border hover:bg-accent'}">
              <div class="flex items-start justify-between"><item.icon class="size-5 {source === item.id ? 'text-signal-accent' : 'text-muted-foreground'}" />{#if source === item.id}<Check class="size-4 text-signal-accent" />{/if}</div>
              <p class="mt-6 text-sm font-medium">{item.label}</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </button>
          {/each}
        </div>
      {:else if step === 2}
        <h2 class="text-lg font-medium">Add session data</h2><p class="mt-1 text-sm text-muted-foreground">Drop a supported file or paste a transcript. Parsing remains local.</p>
        <div class="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <label class="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-center transition-colors hover:border-signal-accent/50 hover:bg-signal-accent/[0.03]">
            <UploadCloud class="size-8 text-signal-accent" />
            <span class="mt-4 text-sm font-medium">{fileName || "Choose a trace file"}</span>
            <span class="mt-1 text-xs text-muted-foreground">JSON, JSONL, Markdown, or text</span>
            <input type="file" accept=".json,.jsonl,.md,.txt" class="sr-only" onchange={readFile} />
          </label>
          <div>
            <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><ClipboardPaste class="size-3.5" />Paste transcript</div>
            <textarea bind:value={text} class="h-64 w-full resize-none rounded-lg border border-border bg-background p-4 font-mono text-xs leading-6 outline-none focus:border-signal-accent" placeholder="User: …&#10;Assistant: …"></textarea>
          </div>
        </div>
      {:else if step === 3}
        <h2 class="text-lg font-medium">1 session detected</h2><p class="mt-1 text-sm text-muted-foreground">Review the parser output before redaction.</p>
        <div class="mt-7 flex items-start gap-4 border-l-2 border-signal-accent pl-4">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{parsed.title}</p>
            <p class="mt-1 font-mono text-[11px] text-muted-foreground">{parsed.messages.length} messages · {parsed.confidence} confidence · {source}</p>
            <div class="mt-4 flex flex-wrap gap-2">{#each parsed.warnings as warning}<span class="rounded border border-signal-warning/20 bg-signal-warning/[0.06] px-2 py-1 text-[11px] text-signal-warning">{warning}</span>{/each}</div>
          </div>
        </div>
      {:else if step === 4}
        <div id="redaction" class="flex items-start gap-3">
          <ShieldCheck class="mt-0.5 size-5 shrink-0 text-signal-success" />
          <div><h2 class="text-lg font-medium">Redaction preview</h2><p class="mt-1 text-sm text-muted-foreground">{preview.categories.reduce((sum, item) => sum + item.count, 0)} sensitive values detected and replaced locally.</p></div>
        </div>
        <div class="mt-7 grid gap-6 lg:grid-cols-[200px_1fr]">
          <div>
            {#if preview.categories.length}
              <ul class="divide-y divide-border">
                {#each preview.categories as category}
                  <li class="flex justify-between py-2.5 text-xs"><span class="capitalize text-muted-foreground">{category.category.replace("-", " ")}</span><span class="tnum font-mono">{category.count}</span></li>
                {/each}
              </ul>
            {:else}
              <p class="text-xs text-signal-success">No obvious secrets detected.</p>
            {/if}
          </div>
          <pre class="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-4 font-mono text-[11px] leading-5 text-muted-foreground">{preview.redactedText}</pre>
        </div>
        <label class="mt-6 flex cursor-pointer items-start gap-3 border-t border-border pt-5 text-sm">
          <input bind:checked={reviewed} type="checkbox" class="mt-0.5 rounded border-border bg-background text-signal-accent focus:ring-signal-accent" />
          <span><strong class="font-medium">I reviewed this import.</strong><span class="mt-0.5 block text-xs text-muted-foreground">I understand automated redaction is best-effort.</span></span>
        </label>
      {:else if step === 5}
        <h2 class="text-lg font-medium">Ready to import</h2><p class="mt-1 text-sm text-muted-foreground">Only this normalized, redacted trace will be stored.</p>
        <dl class="mt-7 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border sm:grid-cols-4 sm:divide-y-0">
          {#each [["Messages", parsed.messages.length], ["Tool events", parsed.messages.filter((m) => m.role === "tool").length], ["Confidence", parsed.confidence], ["Redactions", preview.categories.reduce((sum, item) => sum + item.count, 0)]] as stat}
            <div class="px-4 py-4"><dt class="text-[11px] uppercase tracking-wide text-muted-foreground">{stat[0]}</dt><dd class="tnum mt-2 text-xl font-semibold capitalize">{stat[1]}</dd></div>
          {/each}
        </dl>
        <div class="mt-6 border-l-2 border-signal-accent pl-4">
          <p class="eyebrow">Inferred goal</p>
          <p class="mt-1.5 text-sm leading-6">{parsed.title}</p>
        </div>
      {:else}
        <div class="flex min-h-96 flex-col items-center justify-center text-center">
          <span class="flex size-14 items-center justify-center rounded-full border border-signal-success/30 bg-signal-success/10"><Check class="size-7 text-signal-success" /></span>
          <h2 class="mt-6 text-2xl font-semibold tracking-tight">Session imported</h2>
          <p class="mt-2 max-w-md text-sm leading-6 text-muted-foreground">The normalized trace is ready. Open the session to inspect its timeline and analysis report.</p>
          <a href="/sessions/ses_9f3a1c" class="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Open session <ArrowRight class="size-4" /></a>
        </div>
      {/if}
    </section>

    {#if step < 6}
      <div class="flex justify-between">
        <button onclick={() => (step = Math.max(1, step - 1))} disabled={step === 1} class="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"><ArrowLeft class="size-4" />Back</button>
        <button onclick={next} disabled={(step === 2 && !text.trim()) || (step === 4 && !reviewed)} class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30">{step === 5 ? "Import session" : "Continue"}{#if step === 5}<FileUp class="size-4" />{:else}<ArrowRight class="size-4" />{/if}</button>
      </div>
    {/if}
  </div>
</Shell>
